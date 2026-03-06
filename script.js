(function() {
    const foodSpan = document.getElementById('randomfood');
    if (foodSpan) {
        fetch('foods.txt')
            .then(r => r.text())
            .then(t => {
                const f = t.split(',').map(i => i.trim()).filter(i => i.length > 0);
                if (f.length > 0) foodSpan.innerText = f[Math.floor(Math.random() * f.length)];
            })
            .catch(() => { foodSpan.innerText = "meal"; });
    }

    const yearSpan = document.getElementById('year');
    if (yearSpan) yearSpan.innerText = new Date().getFullYear();

    if (window.location.pathname.includes('recipeviewer.html')) {
        const container = document.getElementById('recipetext');
        const linkSpan = document.getElementById('original-link');
        const url = localStorage.getItem('lastURL');
        const raw = localStorage.getItem('lastRecipe');

        if (url && linkSpan) {
            linkSpan.innerHTML = `Original Link: <a href="${url}" target="_blank">${url}</a>`;
        }

        if (raw && raw.includes('INGREDIENTS') && raw.length > 100) {
            container.innerText = raw.replace(/[#*>\-]/g, '').replace(/[ ]{2,}/g, ' ').trim();
        } else if (url) {
            container.innerText = "Scraping full recipe details...";
            scrape(url);
        }
    }
})();

function decode(html) {
    const txt = document.createElement("textarea");
    txt.innerHTML = html;
    return txt.value.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
}

const btn = document.getElementById('recipesubmit');
if (btn) {
    btn.onclick = (e) => {
        e.preventDefault();
        const input = document.getElementById('recipeurl').value.trim();
        if (!input) return;

        if (input.startsWith('http')) {
            localStorage.setItem('lastURL', input);
            localStorage.setItem('lastRecipe', '');
            window.location.href = 'recipeviewer.html';
        } else {
            localStorage.setItem('lastRecipe', input);
            localStorage.removeItem('lastURL');
            window.location.href = 'recipeviewer.html';
        }
    };
}

async function scrape(target) {
    const proxies = [
        `https://corsproxy.io/?${encodeURIComponent(target)}`,
        `https://api.allorigins.win/get?url=${encodeURIComponent(target)}`
    ];

    for (const p of proxies) {
        try {
            const res = await fetch(p);
            let data = await res.text();
            if (p.includes('allorigins')) data = JSON.parse(data).contents;
            if (data) {
                process(data);
                return;
            }
        } catch (err) { continue; }
    }
    document.getElementById('recipetext').innerText = "Failed to scrape recipe.";
}

function process(html) {
    const container = document.getElementById('recipetext');
    const m = html.match(/<script [^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
    let recipe = null;

    if (m) {
        for (const script of m) {
            try {
                let s = script.replace(/<script.*?>/gi, '').replace(/<\/script>/gi, '').trim();
                if (s.endsWith(';')) s = s.slice(0, -1);
                const data = JSON.parse(s);
                const found = findRecipe(data);
                if (found) { recipe = found; break; }
            } catch (e) {}
        }
    }

    if (recipe) {
        let text = `${decode(recipe.name || "RECIPE").toUpperCase()}\n\nINGREDIENTS:\n`;
        (recipe.recipeIngredient || []).forEach(i => { text += `• ${decode(i).trim()}\n`; });
        
        text += "\nINSTRUCTIONS:\n";
        let steps = recipe.recipeInstructions || [];
        if (!Array.isArray(steps)) steps = [steps];
        
        let count = 1;
        steps.forEach(s => {
            if (typeof s === 'string') {
                text += `${count++}. ${decode(s).trim()}\n\n`;
            } else if (s.itemListElement) {
                s.itemListElement.forEach(item => {
                    const stepText = item.text || item.name || "";
                    if (stepText) text += `${count++}. ${decode(stepText).trim()}\n\n`;
                });
            } else {
                const stepText = s.text || s.name || "";
                if (stepText) text += `${count++}. ${decode(stepText).trim()}\n\n`;
            }
        });

        const notes = html.match(/id="recipe[^"]*notes"[^>]*>([\s\S]*?)<\/div>/i);
        if (notes && notes[1]) {
            text += `\nNOTES:\n${decode(notes[1]).replace(/<[^>]*>?/gm, '').replace(/\s+/g, ' ').trim()}`;
        }

        container.innerText = text.replace(/[#*>\-]/g, '').trim();
        localStorage.setItem('lastRecipe', text);
    }
}

function findRecipe(obj) {
    if (!obj || typeof obj !== 'object') return null;
    if (obj['@type'] === 'Recipe' || (Array.isArray(obj['@type']) && obj['@type'].includes('Recipe'))) return obj;
    if (obj['@graph']) return findRecipe(obj['@graph']);
    if (Array.isArray(obj)) {
        for (const item of obj) {
            const f = findRecipe(item);
            if (f) return f;
        }
    } else {
        for (const key in obj) {
            const f = findRecipe(obj[key]);
            if (f) return f;
        }
    }
    return null;
}
