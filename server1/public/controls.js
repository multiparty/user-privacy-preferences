/**
  * Do not modify this file unless you have too
  * This file has UI handlers.
  */
var jiff_instance = null;

// eslint-disable-next-line no-unused-vars
function connect() {
    $('#connectButton').prop('disabled', true);
    $('#resetButton').prop('disabled', false);
    $('#compareBtn1').prop('disabled', false);
    var party_count = 2;

    if (isNaN(party_count)) {
        $('#output').append('<p class="error">Party count must be a valid number!</p>');
        $('#connectButton').prop('disabled', false);
        $('#compareBtn1').prop('disabled', true);
    } else {
        // Server 1 connection
        jiff_instance = mpc.connect('http://'+window.location.hostname+':8082', 'undefined', {
            crypto_provider: true,
            party_id: 2,
            party_count: 2,
            Zp: null,
            listeners: {
                "log": function (sender, message) { console.log(sender, message); }
            },
            onError: function (error) {
                $('#output').append('<p class="error">'+error+'</p>');
            },
            onConnect: function () {
                $('#connectButton').attr('disabled', true); $('#output').append('<p>All parties Connected!</p>');
                $('#compareBtn1').prop('disabled', false);
            }
        });
    }
}

// k-Means
var k = 5;

// r rounds
var r = 2;

function submit() {
    // tell server 1 to start k-means
    jiff_instance.emit("cluster", [1], "cluster", false);
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
    $('#output').append("<pre>" + output + "</pre>");
}

function reset() {
    // TODO: disconnect and reset connection if necessary
    window.location.reload();
}

function printProfiles() {
    $.getJSON('http://'+window.location.hostname+':8082/profiles.json', function(data){printMeans(data, 1, data.length)});
}
