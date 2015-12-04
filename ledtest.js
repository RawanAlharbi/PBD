var five = require("johnny-five"),board, led;

board = new five.Board();

board.on("ready", function() {
  var button2;
  var led;
  var blinkState=false;
  button2 = new five.Button(5);
  led = new five.Led(3);
  button2.on("release", function() {
   blinkState = !blinkState;
  if(blinkState)
  led.blink(500);
  else
  {
  led.stop();
  led.off();
  }
   });
  

});


