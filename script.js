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
        var linkSpan = document.getElementById('original-link');
        var u = "";
        
        var query = window.location.search.substring(1).split('&');
        for (var i = 0; i < query.length; i++) {
            var pair = query[i].split('=');
            if (pair[0] === 'url') {
                u = decodeURIComponent(pair[1]);
            }
        }
        
        if (!u) u = localStorage.getItem('lastURL');

        if (u) {
            if (linkSpan) linkSpan.innerHTML = '<a href="' + u + '">' + u + '</a>';
            container.innerText = "LOADING VIA SERVER PROXY...";
            
            var x = new XMLHttpRequest();
            var proxyUrl = "https://corsproxy.io/?" + encodeURIComponent(u);
            
            x.open('GET', proxyUrl, true);
            x.onreadystatechange = function() {
                if (x.readyState === 4 && x.status === 200) {
                    var html = x.responseText;
                    var jsonM = html.match(/<script [^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
                    var recipe = null;
                    
                    if (jsonM) {
                        for (var j = 0; j < jsonM.length; j++) {
                            try {
                                var cleanJson = jsonM[j].replace(/<script.*?>/gi, '').replace(/<\/script>/gi, '').replace(/^\s+|\s+$/g, '');
                                if (cleanJson.charAt(cleanJson.length - 1) === ';') cleanJson = cleanJson.slice(0, -1);
                                var data = JSON.parse(cleanJson);
                                
                                if (data['@graph']) {
                                    for (var g = 0; g < data['@graph'].length; g++) {
                                        if (data['@graph'][g]['@type'] === 'Recipe') {
                                            recipe = data['@graph'][g];
                                            break;
                                        }
                                    }
                                } else if (data['@type'] === 'Recipe' || (data['@type'] && data['@type'].indexOf('Recipe') !== -1)) {
                                    recipe = data;
                                }
                                if (recipe) break;
                            } catch (e) {}
                        }
                    }

                    if (recipe) {
                        var out = (recipe.name || "RECIPE").toUpperCase() + "\n\nINGREDIENTS:\n";
                        var ing = recipe.recipeIngredient || [];
                        for (var k = 0; k < ing.length; k++) {
                            out += "• " + ing[k] + "\n";
                        }
                        out += "\nINSTRUCTIONS:\n";
                        var steps = recipe.recipeInstructions || [];
                        if (!Array.isArray(steps)) steps = [steps];
                        for (var l = 0; l < steps.length; l++) {
                            var val = (typeof steps[l] === 'string') ? steps[l] : (steps[l].text || "");
                            if (val) out += (l + 1) + ". " + val + "\n\n";
                        }
                        
                        var notesM = html.match(/id="recipe[^"]*notes"[^>]*>([\s\S]*?)<\/div>/i);
                        if (notesM && notesM[1]) {
                            out += "NOTES:\n" + notesM[1].replace(/<[^>]*>?/gm, '').replace(/\s+/g, ' ');
                        }

                        container.innerText = out;
                        localStorage.setItem('lastRecipe', out);
                    } else {
                        container.innerText = "SERVER RETURNED DATA BUT NO RECIPE FOUND.";
                    }
                }
            };
            x.send();
        }
    }
})();

var btn = document.getElementById('recipesubmit');
if (btn) {
    btn.onclick = function() {
        var input = document.getElementById('recipeurl').value.replace(/^\s+|\s+$/g, '');
        if (input.indexOf('http') === 0) {
            localStorage.setItem('lastURL', input);
            window.location.href = 'recipeviewer.html?url=' + encodeURIComponent(input);
        } else {
            localStorage.setItem('lastRecipe', input);
            window.location.href = 'recipeviewer.html';
        }
        return false;
    };
}
