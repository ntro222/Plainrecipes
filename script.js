(function() {
    var foodSpan = document.getElementById('randomfood');
    if (foodSpan) {
        fetch('foods.txt')
            .then(r => r.text())
            .then(t => {
                var foods = t.split(',').map(f => f.trim()).filter(f => f.length > 0);
                if (foods.length > 0) {
                    foodSpan.innerText = foods[Math.floor(Math.random() * foods.length)];
                }
            })
            .catch(() => { foodSpan.innerText = "meal"; });
    }

    var yearSpan = document.getElementById('year');
    if (yearSpan) yearSpan.innerText = new Date().getFullYear();

    if (window.location.pathname.includes('recipeviewer.html')) {
        var raw = localStorage.getItem('lastRecipe') || localStorage.getItem('lastMD');
        var url = localStorage.getItem('lastURL');
        var container = document.getElementById('recipetext');
        var linkSpan = document.getElementById('original-link');

        if (url && linkSpan) linkSpan.innerHTML = '<a href="' + url + '" target="_blank">' + url + '</a>';
        if (raw && container) {
            var finalClean = raw.replace(/[#*>\-]/g, '').replace(/[ ]{2,}/g, ' ').trim();
            container.innerText = finalClean;
        }
    }
})();

var btn = document.getElementById('recipesubmit');
if (btn) {
    btn.onclick = function(e) {
        e.preventDefault();
        var field = document.getElementById('recipeurl');
        var input = field.value.trim();
        if (!input) return;

        if (input.startsWith('http')) {
            localStorage.setItem('lastURL', input);
            var v = window.open('recipeviewer.html', '_blank');
            const proxies = ["https://corsproxy.io/?", "https://api.allorigins.win/get?url="];
            tryProxy(0, input, v, proxies);
        } else {
            localStorage.setItem('lastRecipe', input);
            localStorage.removeItem('lastURL');
            window.open('recipeviewer.html', '_blank');
        }
    };
}

function tryProxy(index, targetUrl, win, proxyList) {
    if (index >= proxyList.length) return;
    fetch(proxyList[index] + encodeURIComponent(targetUrl))
        .then(res => proxyList[index].includes('allorigins') ? res.json() : res.text())
        .then(data => {
            var html = typeof data === 'object' ? data.contents : data;
            process(html, win);
        });
}

function decodeText(h) {
    var t = document.createElement("textarea");
    t.innerHTML = h;
    return t.value.replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

function process(html, win) {
    var d = null;
    var m = html.match(/<script [^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
    if (m) {
        for (var i = 0; i < m.length; i++) {
            try {
                var str = m[i].replace(/<script.*?>/gi, '').replace(/<\/script>/gi, '').trim();
                if (str.endsWith(';')) str = str.slice(0, -1);
                d = findR(JSON.parse(str));
                if (d) break;
            } catch (err) {}
        }
    }
    
    if (d) {
        var text = (d.name || "RECIPE").toUpperCase() + "\n\n";
        text += "INGREDIENTS:\n";
        (d.recipeIngredient || []).forEach(item => { text += "• " + decodeText(item).trim() + "\n"; });
        
        text += "\nINSTRUCTIONS:\n";
        var ins = d.recipeInstructions || [];
        if (!Array.isArray(ins)) ins = [ins];
        var count = 1;
        ins.forEach(s => {
            var val = (typeof s === 'string') ? s : (s.text || s.name || "");
            if (s.itemListElement) s.itemListElement.forEach(sub => { val += (sub.text || "") + " "; });
            if (val.trim()) text += count++ + ". " + decodeText(val.trim()).replace(/\s+/g, ' ') + "\n\n";
        });

        var notesMatch = html.match(/id="recipe[^"]*notes"[^>]*>([\s\S]*?)<\/div>/i);
        if (notesMatch && notesMatch[1]) {
            var cleanNotes = notesMatch[1].replace(/<[^>]*>?/gm, '');
            text += "NOTES:\n" + decodeText(cleanNotes).replace(/\s+/g, ' ').trim();
        }

        localStorage.setItem('lastRecipe', text);
        if (win) win.location.reload();
    }
}

function findR(o) {
    if (!o || typeof o !== 'object') return null;
    if (o['@type'] === 'Recipe' || (Array.isArray(o['@type']) && o['@type'].includes('Recipe'))) return o;
    if (o['@graph']) return findR(o['@graph']);
    if (Array.isArray(o)) {
        for (var i = 0; i < o.length; i++) { var f = findR(o[i]); if (f) return f; }
    } else {
        for (var k in o) { if (typeof o[k] === 'object') { var f = findR(o[k]); if (f) return f; } }
    }
    return null;
}

var cp = document.getElementById('copypt');
if (cp) {
    cp.onclick = function() {
        navigator.clipboard.writeText(document.getElementById('recipetext').innerText);
        cp.innerText = "Copied!";
        setTimeout(() => { cp.innerText = "Copy as text"; }, 2000);
    };
}