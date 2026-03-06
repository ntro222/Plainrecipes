(function() {
    var foodSpan = document.getElementById('randomfood');
    if (foodSpan) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', 'foods.txt', true);
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4 && xhr.status === 200) {
                var foods = xhr.responseText.split(',');
                var clean = [];
                for (var i = 0; i < foods.length; i++) {
                    var f = foods[i].replace(/^\s+|\s+$/g, '');
                    if (f.length > 0) clean.push(f);
                }
                if (clean.length > 0) {
                    foodSpan.innerText = clean[Math.floor(Math.random() * clean.length)];
                }
            }
        };
        xhr.send();
    }

    var yearSpan = document.getElementById('year');
    if (yearSpan) yearSpan.innerText = new Date().getFullYear();

    if (window.location.pathname.indexOf('recipeviewer.html') !== -1) {
        var url = localStorage.getItem('lastURL');
        var raw = localStorage.getItem('lastRecipe');
        var container = document.getElementById('recipetext');
        var linkSpan = document.getElementById('original-link');

        if (url && linkSpan) {
            linkSpan.innerHTML = '<a href="' + url + '" target="_blank">' + url + '</a>';
        }

        if (raw && raw.indexOf('INGREDIENTS') !== -1) {
            var finalClean = raw.replace(/[#*>\-]/g, '').replace(/[ ]{2,}/g, ' ');
            container.innerText = finalClean;
        } else if (url) {
            container.innerText = "Scraping recipe... (iOS 6 Legacy Mode)";
            tryProxy(0, url);
        }
    }
})();

var btn = document.getElementById('recipesubmit');
if (btn) {
    btn.onclick = function(e) {
        if (e && e.preventDefault) e.preventDefault();
        var field = document.getElementById('recipeurl');
        var input = field.value.replace(/^\s+|\s+$/g, '');
        if (!input) return false;

        if (input.indexOf('http') === 0) {
            localStorage.setItem('lastURL', input);
            localStorage.removeItem('lastRecipe');
            window.location.href = 'recipeviewer.html';
        } else {
            localStorage.setItem('lastRecipe', input);
            localStorage.removeItem('lastURL');
            window.location.href = 'recipeviewer.html';
        }
        return false;
    };
}

function tryProxy(index, targetUrl) {
    var proxies = ["https://corsproxy.io/?", "https://api.allorigins.win/get?url="];
    if (index >= proxies.length) {
        document.getElementById('recipetext').innerText = "Error: Scraper failed.";
        return;
    }
    var xhr = new XMLHttpRequest();
    xhr.open('GET', proxies[index] + encodeURIComponent(targetUrl), true);
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                var data = xhr.responseText;
                if (proxies[index].indexOf('allorigins') !== -1) {
                    try { data = JSON.parse(data).contents; } catch(e) {}
                }
                process(data);
            } else {
                tryProxy(index + 1, targetUrl);
            }
        }
    };
    xhr.send();
}

function decodeText(h) {
    var t = document.createElement("textarea");
    t.innerHTML = h;
    return t.value.replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

function process(html) {
    var d = null;
    var m = html.match(/<script [^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
    if (m) {
        for (var i = 0; i < m.length; i++) {
            try {
                var str = m[i].replace(/<script.*?>/gi, '').replace(/<\/script>/gi, '').replace(/^\s+|\s+$/g, '');
                if (str.charAt(str.length - 1) === ';') str = str.slice(0, -1);
                d = findR(JSON.parse(str));
                if (d) break;
            } catch (err) {}
        }
    }
    
    if (d) {
        var text = (d.name || "RECIPE").toUpperCase() + "\n\n";
        text += "INGREDIENTS:\n";
        var ing = d.recipeIngredient || [];
        for (var j = 0; j < ing.length; j++) {
            text += "• " + decodeText(ing[j]).replace(/^\s+|\s+$/g, '') + "\n";
        }
        
        text += "\nINSTRUCTIONS:\n";
        var ins = d.recipeInstructions || [];
        if (!Array.isArray(ins)) ins = [ins];
        var count = 1;
        for (var k = 0; k < ins.length; k++) {
            var step = ins[k];
            var val = (typeof step === 'string') ? step : (step.text || step.name || "");
            if (step.itemListElement) {
                for (var l = 0; l < step.itemListElement.length; l++) {
                    val += (step.itemListElement[l].text || "") + " ";
                }
            }
            if (val.replace(/^\s+|\s+$/g, '')) {
                text += count++ + ". " + decodeText(val).replace(/\s+/g, ' ') + "\n\n";
            }
        }

        var notesMatch = html.match(/id="recipe[^"]*notes"[^>]*>([\s\S]*?)<\/div>/i);
        if (notesMatch && notesMatch[1]) {
            var cleanNotes = notesMatch[1].replace(/<[^>]*>?/gm, '');
            text += "NOTES:\n" + decodeText(cleanNotes).replace(/\s+/g, ' ');
        }

        localStorage.setItem('lastRecipe', text);
        document.getElementById('recipetext').innerText = text.replace(/[#*>\-]/g, '').replace(/[ ]{2,}/g, ' ');
    }
}

function findR(o) {
    if (!o || typeof o !== 'object') return null;
    var type = o['@type'];
    if (type === 'Recipe' || (Array.isArray(type) && type.indexOf('Recipe') !== -1)) return o;
    if (o['@graph']) return findR(o['@graph']);
    if (Array.isArray(o)) {
        for (var i = 0; i < o.length; i++) { 
            var f = findR(o[i]); 
            if (f) return f; 
        }
    } else {
        for (var k in o) { 
            if (typeof o[k] === 'object') { 
                var f2 = findR(o[k]); 
                if (f2) return f2; 
            } 
        }
    }
    return null;
}

var cp = document.getElementById('copypt');
if (cp) {
    cp.onclick = function() {
        var area = document.createElement("textarea");
        area.value = document.getElementById('recipetext').innerText;
        document.body.appendChild(area);
        area.select();
        document.execCommand("copy");
        document.body.removeChild(area);
        cp.innerText = "Copied!";
        setTimeout(function() { cp.innerText = "Copy as text"; }, 2000);
    };
}
