var five = require("johnny-five"),
	board, photoresistor;

board = new five.Board();

board.on("ready", function() {

	// Create a new `photoresistor` hardware instance.
	servoFeedback = new five.Sensor({
		pin: "A0 ",
		freq: 100
	});

	// Inject the `sensor` hardware into
	// the Repl instance's context;
	// allows direct command line access
	board.repl.inject({
		pot: servoFeedback
	});
	
	var prev = 0;
	var once = false;
	// "data" get the current reading from the photoresistor
	servoFeedback.on("data", function() {
		
		
		
		if ( prev == this.value && !once){
			console.log(this.value);
			once = true;
		}
		else if (prev != this.value && prev != this.value +1 && prev != this.value-1 ){
			prev = this.value;
			once = false;
			
		}

		
		
	});
});