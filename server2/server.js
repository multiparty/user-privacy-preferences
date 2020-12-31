var path = require('path');
var express = require('express');
var app = express();
var http = require('http').Server(app);

// Serve static files.
app.use('/', express.static(path.join(__dirname, 'public')));
app.use('/dist', express.static(path.join(__dirname, '..', 'jiff', 'dist')));
app.use('/lib/ext', express.static(path.join(__dirname, '..', 'jiff', 'lib', 'ext')));
console.log('Direct your browser to *:3002/client.html.\n');

var JIFFServer = require('../jiff/lib/jiff-server.js');

// (submission, recommendation) server jiff instance
new JIFFServer(http, {logs: true});
http.listen(3002, function () { console.log('listening on *:3002'); });

var t1, t2;  // benchmark timestamps

/***** Set up local compute parties *****/

var mpc = require('./public/mpc');
const fs = require('fs');

var jiff_client_submit = mpc.connect('http://localhost:3001', 'submission', {
    crypto_provider: true,
    party_count: 20,
    Zp: null,
    party_id: 1,
    listeners: {
        "log": function (sender, message) { console.log(sender, message); },
        "add": function (sender, message) {
            var point = [];
            try {
                point = JSON.parse(message);
                if (point.length <= 1 || point[0] !== null || point[1] == null
                    || !(typeof(point[1]) === "number") || point[1] > Zp - 1) {
                    throw new Error("User failed to submit a valid preference profile.");
                }
            } catch (err) {
                console.warn(err);
                console.log("Ignoring...");
                jiff_client_submit.emit("error", [sender], point + " not added", false);
            }

            console.log("adding shares to server 2");

            // Read current database
            var shares = [];
            fs.readFile(__dirname + '/server_2_shares.json', (err, data) => {
                if (err) throw err;
                shares = JSON.parse(data);

                // Add the new submitted preferences
                shares.push(point);
                fs.writeFile(
                    __dirname + '/server_2_shares.json',
                    JSON.stringify(shares, null, 2).split(",\n  [").join(",n[").split(",\n    ").join(", ").split(",n[").join(",\n  [").split("\n    ").join("").split("\n  ]").join("]"),
                    function(err) { if (err) throw err; }
                );
            });

            console.log("added ", point);
            // socket.send("added " + point);
            jiff_client_submit.emit("submit", [sender], "added " + point, false);
        }
    },
    onError: function (error) { console.log(error); },
    onConnect: function () { console.log("onConnect"); }
});

var jiff_client_recommend = null;
function jiff_rec_init() {
    return mpc.connect('http://localhost:3002', 'recommendation', {
        crypto_provider: true,
        party_count: 20,
        Zp: 13,
        listeners: {
            "log": function (sender, message) { console.log(sender, message); },
            "compare": function (sender, message) {
                console.log("comparing with user #" + sender);
                compare(sender);
            }
        },
        onError: function (error) { console.log(error); },
        onConnect: function () { console.log("onConnect"); }
    });
}
jiff_client_recommend = jiff_rec_init();

var jiff_other_server = mpc.connect('http://localhost:3001', 'clustering', {
    crypto_provider: true,
    party_count: 2,
    Zp: 229,
    party_id: 2,
    listeners: {
        "log": function (sender, message) { console.log(sender, message); },
        "cluster": function (sender, message) {
            // IF "start":
            console.log(sender, message);
            jiff_other_server.emit("log", [1], "starting k-means", false);
            let params = JSON.parse(message);
            k = params[0];
            r = params[1];
            l = params[2];
            dim = params[3];
            benchmarktype = params[4];
            cluster();
        }
    },
    onError: function (error) { console.log(error); },
    onConnect: function () { console.log("onConnect"); }
});

var means = [];
var k = 5;  // k-Means
var r = 2;  // r rounds
var l = 10;  // data points
var dim = 10;  // dimensions
var benchmarktype = "default";

// Begin Clustering
// eslint-disable-next-line no-unused-vars
function cluster() {
    t0 = (+ new Date());

    // Pick "random" half-means to submit
    for (var i = 0; i < k; i++) {
        means[i] = Array.from({length: 10}, () => Math.round(Math.random() * 6));
    }

    // Load test data
    var points = [];
    fs.readFile(__dirname + '/server_2_shares.json', (err, data) => {
        if (err) throw err;
        points = JSON.parse(data);

        // eslint-disable-next-line no-undef
        var promise = mpc.computeClusters(means, points, k, r, l, dim, jiff_other_server);
        promise.then(handleResult.bind(null, k, r));
    });
}

function handleResult(k, r, result) {
    console.log("result opened", k, r, result);
    console.log("CLUSTER2 All Done");
    bench((+ new Date()) - t0, benchmarktype);
    console.log("Clustering finished in " + ((+ new Date()) - t0) + " milliseconds.");
    meansSave(result);

    for (var i = 0; i < k; i++) {
        for (var d = 0; d < 10; d++) {
            means[i][d] = result[(i*10)+d];
        }
    }
    printMeans();

    reset();
}

function printMeans(means_local = means, start = 0, k_local = k) {
    var output = "";
    for (var i = 0; i < k_local; i++) {
        output += "(";
        for (var d = start; d < start + 9; d++) {
            output += Math.round(means_local[i][d]) + ", ";
        }
        output += Math.round(means_local[i][d]) + ")\n";
    }
    console.log(output);
}

// Do preference comparison
// eslint-disable-next-line no-unused-vars
function compare(p_id) {
    // Load preferences profiles
    var user_data = [];
    fs.readFile(__dirname + '/public/profiles.json', (err, data) => {
        if (err) throw err;
        user_data = JSON.parse(data);
        console.log("prefs = user_data[#] = (Ex.): " + user_data[0]);
        console.log("user_data" + user_data);

        /*** Begin MPC Comparison ***/
        var profilesCount = 3;//user_data.length;
        var prefCount = 10;//user_data[0].length;
        for (var j = 1; j <= profilesCount; j++) {
            var prefs = user_data[j-1];
            for (var i = 1; i < prefCount; i++) {
                // eslint-disable-next-line no-undef
                var promise = mpc.computeComparison(prefs[i], p_id, null, jiff_client_recommend);
                promise.then(function (res) { console.log(res); });
            }
            mpc.computeComparison(prefs[prefCount], p_id, null, jiff_client_recommend).then(function (){
                console.log("recommendation completed");
                jiff_client_recommend.disconnect(false, true);
                jiff_client_recommend = jiff_rec_init();
            });
        }
    });
}

function reset() {
    console.log("is disconnecting");
    jiff_other_server.disconnect(false, true);
    // jiff_other_server.disconnect(true, true, function () {
    console.log("has disconnected");
    jiff_other_server = mpc.connect('http://localhost:3001', 'clustering', {
        crypto_provider: true,
        party_count: 2,
        Zp: 229,
        party_id: 2,
        listeners: {
            "log": function (sender, message) { console.log(sender, message); },
            "cluster": function (sender, message) {
                // IF "start":
                console.log(sender, message);
                jiff_other_server.emit("log", [1], "starting k-means", false);
                let params = JSON.parse(message);
                k = params[0];
                r = params[1];
                l = params[2];
                dim = params[3];
                type = params[4];
                cluster();
            }
        },
        onError: function (error) { console.log(error); },
        onConnect: function () { console.log("onReconnect"); }
    });
}

function meansSave(result) {
    var prefsize = [3, 4, 2, 13, 2, 2, 2, 2, 2, 2];
    var profiles = Array.from({length: Math.floor(result.length/10)}, () => Array.from({length: 11}, () => null));
    for (var i = 0; i < Math.floor(result.length/10)*10; i++) {
        profiles[Math.floor(i/10)][i%10+1] = Math.floor(result[i]/prefsize[i%10]);
    }
    fs.writeFile(__dirname + '/public/profiles.json', JSON.stringify(profiles, null, 2), function(err) {if (err) throw err;});
}

function bench(time, name) {
    fs.readFile(__dirname + '/benchmark_'+name+'.txt', (err, data) => {
        if (err) throw err;
        data += "\n" + k + "\t" + r + "\t" + l + "\t" + dim + "\t" + time;
        fs.writeFile(__dirname + '/benchmark_'+name+'.txt', data, function(err) {if (err) throw err;});
    });
}
