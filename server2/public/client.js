/**
  * Do not modify this file unless you have too
  * This file has UI handlers.
  */
var Zp = 13;
var jiff_servers = {1: null, 2: null};

const max_parties = 20;
function connectServer(n, computation_id = "nil_computation", port, size = max_parties, p = null, onConnect) {
    disconnectServer(n);  // reconnect if already connected
    if (port == null) {
        port = ['3001', '3002'][n-1];
    }
    jiff_servers[n] = mpc.connect('http://'+window.location.hostname+':'+port, computation_id, {
        crypto_provider: true,
        party_count: size,
        Zp: p,
        listeners: {
            "log": function (sender, message) { console.log(sender, message); }
        },
        onError: function (error) {
            console.log(error);
        }//,
        // onConnect: function (jiff) {
        //     console.log("onConnect"); onConnect(jiff);
        // }
    });
    // onConnect(jiff_servers[n]);
    jiff_servers[n].wait_for(1, onConnect);
    return jiff_servers[n];
}

function disconnectServer(n) {
    if (!(jiff_servers[n] == null)) {
        jiff_servers[n].disconnect(false, true);
        jiff_servers[n] = null;
    }
}

function och() {
    set(4);
    document.getElementById("set4").innerHTML = document.getElementById("input_item10").value + "mb";
}

var profilesCount = 3;  // TODO: get from server
var prefCount = 10;  // form data (preferences)
var prefs = [];
function set(id) {
    document.getElementById("set" + id).innerHTML = "";

    if ($("input[name="+id+"]").attr('type') == "radio") {
        prefs[id] = $("input:radio[name="+id+"]:checked").val();
    } else if ($("input[name="+id+"]").attr('type') == "checkbox") {
        prefs[id] = ($("input[name="+id+"]").is(":checked"))? 1 : 0;
    } else {
        prefs[id] = $("input[name="+id+"]").val();
    }
    prefs[id] = parseInt(prefs[id]);
}

// eslint-disable-next-line no-unused-vars
function submit() {
    $('#submitBtn').attr('disabled', true);

    connectServer(1, 'submission');
    connectServer(2, 'submission');

    // Split each privacy preference into secret shares
    var shares = {1: [], 2:[]};
    for (var i = 0; i < 10; i++) {
        let share = jiff_servers[1].hooks.computeShares(jiff_servers[1], prefs[i+1], [1, 2], 2, Zp);
        shares[1][i] = share[1];
        shares[2][i] = share[2];
    }

    // Distribute new secret shares
    jiff_servers[1].emit("add", [1], JSON.stringify(shares[1]), false);
    jiff_servers[2].emit("add", [1], JSON.stringify(shares[2]), false);

    disconnectServer(1);
    disconnectServer(2);

    $('#button').attr('disabled', false); $('#output').append('<p>Preference shares Submitted!</p>');
}

// eslint-disable-next-line no-unused-vars
function compare() {
    $('#compareBtn').attr('disabled', true);

    disconnectServer(1);

    // Server 2 with Zp = 13
    connectServer(2, "recommendation", null, null, Zp, function (jiff) {
        // Begin MPC comparison
        for (var j = 1; j <= profilesCount; j++) {
            for (var i = 1; i <= prefCount; i++) {
                if (prefs[i] !== undefined) {
                    // eslint-disable-next-line no-undef
                    var promise = mpc.computeComparison(prefs[i], jiff.id, null, jiff);
                    promise.then(handleResult.bind(null, i, j, false));
                } else {
                    // eslint-disable-next-line no-undef
                    var promise = mpc.computeComparison(0, jiff.id, "unset", jiff);
                    promise.then(handleResult.bind(null, i, j, true));
                }
            }
        }
    }).emit("compare", [1], "", false);
}

var unsetPrefs = [];
var similarities = []; //[0,0,0,0,0,0,0,0];
similarities[0] = 0;
function handleResult(pref_index, party_index, unset = false, result) {
    console.log("pref_index: " + pref_index);
    console.log("result: " + result);
    console.log("unset: " + unset);
    if (pref_index === 1) {
        similarities[party_index] = 0;
    }
    if (unset) {
        if (party_index === 1) {
            unsetPrefs.push(pref_index);
        }
        result = -1;
    } else {
        similarities[party_index] += result;
    }
    var statement = result === 1 ? 'the same' : result === 0 ? 'different' : 'unset';
    $('#output').append('<span>Preference #' + pref_index + ' is ' + statement + '.</span><br>');

    var color = result === 1 ? "lightGreen" : result === 0 ? "lightCoral" : "yellow";
    document.getElementById(""+pref_index).setAttribute("style", "background-color: " + color);

    if (pref_index === prefCount) {
        $('#output').append('<span>Profile #' + party_index + ' has ' + similarities[party_index] + ' preferences in common.</span><br><br>');
        if (party_index === profilesCount) {
            $.getJSON('profiles.json', function(data){recommend(data)});
        }
    }
}

function recommend(data) {
    var nearestNeighbor = similarities.indexOf(Math.max(...similarities));  // partyIndex
    $('#output').append("<span>The nearest neighbor is Profile #" + nearestNeighbor + " with " + similarities[nearestNeighbor] + " preferences in common.</span><br>");
    var recommendations = data[nearestNeighbor - 1];
    for (var i = 0; i < unsetPrefs.length; i++) {
        console.log("Pref #"+unsetPrefs[i]+" is suggested to be " + recommendations[unsetPrefs[i]] + ".");
        $('#output').append("<span>Suggest preference #" + unsetPrefs[i] + " to be " + recommendations[unsetPrefs[i]] + ".</span><br>");
        document.getElementById("set" + unsetPrefs[i]).innerHTML = "&nbsp;&nbsp;&nbsp;&nbsp;(Suggested: " + recommendations[unsetPrefs[i]] + ")";
    }
    // disconnect();
    disconnectServer(2);
    console.log("recommendation completed");
}
