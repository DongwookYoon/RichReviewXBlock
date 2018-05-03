var Log = function() {
    this.name = "Log";
    this.debugThis = function(message) {
        console.log("DEBUG: " + message);
        return;
    }
};

exports.Log = Log;