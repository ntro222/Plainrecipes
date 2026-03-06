(function() {
    var foodSpan = document.getElementById('randomfood');
    if (foodSpan) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', 'foods.txt', true);
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4 && xhr.status === 200) {
                var f = xhr.responseText.split(',');
                var res = f[Math.floor(Math.random() * f.length)];
                foodSpan.innerText = res.replace(/^\s+|\s+$/g, '');
            }
        };
        xhr.send();
    }

    if (window.location.pathname.indexOf('recipeviewer.html') !== -1) {
        var container = document.getElementById('recipetext');
        var u = "";
        var query = window.location.search.substring(1).split('&');
        for (var i = 0; i < query.length; i++) {
            var pair = query[i].split('=');
            if (pair[0] === 'url') u = decodeURIComponent(pair[1]);
        }
        if (!u) u = localStorage.getItem('lastURL');

        if (u) {
            container.innerText = "ATTEMPTING INSECURE PROXY FETCH...";
            var x = new XMLHttpRequest();
            var proxy = "http://api.allorigins.win/get?url=" + encodeURIComponent(u);
            
            x.open('GET', proxy, true);
            x.onreadystatechange = function() {
                if (x.readyState === 4) {
                    if (x.status === 200) {
                        var d = JSON.parse(x.responseText).contents;
                        processRecipe(d);
                    } else {
                        container.innerText = "SSL/CONNECTION ERROR: YOUR 4S CANNOT REACH THE PROXY.";
                    }
                }
            };
            x.send();
        }
    }
})();

function processRecipe(html) {
    var container = document.getElementById('recipetext');
    var jsonM = html.match(/<script [^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
    var r = null;
    if (jsonM) {
        for (var j = 0; j < jsonM.length; j++) {
            try {
                var s = jsonM[j].replace(/<script.*?>/gi, '').replace(/<\/script>/gi, '').replace(/^\s+|\s+$/g, '');
                if (s.charAt(s.length - 1) === ';') s = s.slice(0, -1);
                var data = JSON.parse(s);
                if (data['@graph']) {
                    for (var g = 0; g < data['@graph'].length; g++) {
                        if (data['@graph'][g]['@type'] === 'Recipe') { r = data['@graph'][g]; break; }
                    }
                } else if (data['@type'] === 'Recipe') { r = data; }
                if (r) break;
            } catch (e) {}
        }
    }
    if (r) {
        var out = (r.name || "RECIPE").toUpperCase() + "\n\nINGREDIENTS:\n";
        for (var k = 0; k < r.recipeIngredient.length; k++) out += "• " + r.recipeIngredient[k] + "\n";
        out += "\nINSTRUCTIONS:\n";
        var steps = r.recipeInstructions;
        if (!Array.isArray(steps)) steps = [steps];
        for (var l = 0; l < steps.length; l++) {
            var v = (typeof steps[l] === 'string') ? steps[l] : (steps[l].text || "");
            out += (l + 1) + ". " + v + "\n\n";
        }
        container.innerText = out;
        localStorage.setItem('lastRecipe', out);
    }
}

var btn = document.getElementById('recipesubmit');
if (btn) {
    btn.onclick = function() {
        var val = document.getElementById('recipeurl').value.replace(/^\s+|\s+$/g, '');
        localStorage.setItem('lastURL', val);
        window.location.href = 'recipeviewer.html?url=' + encodeURIComponent(val);
        return false;
    };
}
