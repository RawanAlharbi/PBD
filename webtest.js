// initialize everything, web server, socket.io, filesystem, johnny-five
var app = require('http').createServer(handler)
  , io = require('socket.io').listen(app)
  , fs = require('fs')
  , five = require("johnny-five"),
  board,button,servo,led,sensor,lightSwitch;
  
var change = false;
var wait = 0;
var program = "";
var buttonStates = [];
var lightStates = [];
var index = 0;
var last;
var sendIt = false;
var active = "";
var fullProgram = [];
var prev = 0;
var once = false;

function component (type,role) {
  this.type = type;
  this.state = "";
  this.data = [];
  this.role = role;
}

component.prototype.analyzeState = function() {
  
  
  if (this.type == "l")
  {
    var same = true;
    
    for(var i=0; i<this.data.length ; i++)
    {
      if (this.data[i] != this.data[i+1] && i+1<this.data.length)
      {
        same = false;
        this.state = "blink";
      }
    }
    
    if(same)
    {
      if(this.data[0] == 0)
        this.state = "off";
      else {
        this.state = "on";
      }
    }
    
    
    
  }else if (this.type == "knob") {
    
    if(this.data.length == 1)
    {
      this.state = "range1";
      
    }else if (this.data.length == 2) {
      this.state = "range2";
    }else {
      
      var lookslike; 
      
      if(this.data[0] > this.data[1])
        lookslike = "decreasing";
      else
        lookslike = "increasing";
      
      var any = true;
      
      
      for(var i=2; i<this.data.length ; i++)
      {
        if(lookslike === "decreasing")
        {
          if(this.data[i]>this.data[i-1])
          {
            any = false;
            break;
          }
        }else {
          if(this.data[i]<this.data[i-1])
          {
            any = false;
            break;
          }
        }
        
      }
      
      if(any)
      {
        this.state = "any";
        
      }else {
        this.state = "sequence";
      }
      
    }
    
  }
};

component.prototype.writelogic = function(prev) {
  
  var text;
  
  
  // the defaultl depends on the state 
  if(this.type == "knob")
  {
    
    
    if(this.state == "range1"){
      
      console.log("If the knob is between 0 to " +  this.data[0] );
      knobChanged[1] += "if (knob2.value >= 0 && knob2.value <= " +  this.data[0] + ")\n";
      text = "if (knob2.value >= 0 && knob2.value <= " +  this.data[0] + ")\n";
      
    }
    else if (this.state == "range2") {
      
      console.log("If the knob is between "+ this.data[0] + " to " +  this.data[1] );
      if(this.data[0]<this.data[1]){
        knobChanged[1] += "if (knob2.value >= "+this.data[0] + "&& knob2.value <= " +  this.data[1] + ")\n";
        text = "if (knob2.value >= "+this.data[0] + "&& knob2.value <= " +  this.data[1] + ")\n";
      }
      else{
        knobChanged[1] += "if (knob2.value >= "+this.data[1] + "&& knob2.value <= " +  this.data[0] + ")\n";
        text = "if (knob2.value >= "+this.data[1] + "&& knob2.value <= " +  this.data[0] + ")\n";
      }
      
    }else if (this.state == "any") {
      
      console.log("If the knob is on any of these points "+ this.data );
      knobChanged[1] += "if (["+this.data+"].indexOf(knob2.value) != -1)\n";
      text = "if (["+this.data+"].indexOf(knob2.value) != -1)\n";
      
    }else if(this.state == "sequence")
    {
      console.log("If the knob goes exactly in this sequence "+ this.data );
    }
    
    
  }else if (this.type == "lS") {
    
    console.log("Default Light Sensor");
    
  }else if (this.type =="l") {
    
    console.log(this.state);
    
    if(this.state == "blink")
    {
      declarations += "var blinkState=false;";
      buttonReleased[1] += "blinkState = !blinkState;\nif(blinkState)\nled.blink(500);\nelse{\nled.stop();\nled.off();\n}\n";
      knobChanged[1] += "led.blink(500);";
      
    }else if(this.state == "on") {
      buttonReleased[1] += "led.toggle();\n";
      knobChanged[1] += "//led.on();\n";
      knobChanged[1] += "led.brightness(knob2.value/4);\n";
    }else if(this.state == "off") {
      //buttonReleased[1] += "led.off();\n";
      knobChanged[1] += "led.stop();\nled.off();\n";
    }
    
  }else if (this.type =="b") {
    
    if(this.state == "count")
    {
       console.log("If the button was clicked "+ this.data.length + "times");
    }else {
       console.log("If the button was clicked ");
    }
    
  }

  
  
};

// make web server listen on port 80
  app.listen(8080);
  
board = new five.Board();


// on board ready
board.on("ready", function() {
  
  

  // init a led on pin 13, strobe every 1000ms
//  led = new five.Led(3).strobe(1000);

  // setup a stanard servo, center at start
//  servo = new five.Servo({
//    pin:6,
//    range: [0,180],
//    type: "standard",
//    center:true
//  });

  // poll this sensor every second
//  sensor = new five.Sensor({
//    pin: 5, 
//    type: "digital"
//    //freq: 100
//  });

  button = new five.Button({
    pin: 5
  });
  

  // LED
  lightSwitch = new five.Button({
    pin: 6
  });
  
  
  //the final program touch button 
  sensor = new five.Button({
    pin: 8
    });
    
    knob = new five.Sensor({
      pin: "A2",
      freq: 250
    });
    
    
    sensorSwitch = new five.Button({
      pin: 2
    });
    
    lightSensor = new five.Sensor({
      pin: "A1"
        });
        
    servoFeedback = new five.Sensor({
      pin: "A3 ",
      freq: 100
    });
  

});




// handle web server
function handler (req, res) {
  fs.readFile(__dirname + '/index.html',
  function (err, data) {
    if (err) {
      res.writeHead(500);
      return res.end('Error loading index.html');
    }

    res.writeHead(200);
    res.end(data);
  });
}





// on a socket connection
io.sockets.on('connection', function (socket) {
  
  
  socket.emit('news', { hello: 'world' });
 
  socket.on('deploy', function (data) {
    console.log(data.raw);
    eval(data.raw);

  });


 
  // if board is ready
  if(board.isReady){
    
    
   
        button.on("release", function() {
          
          //console.log(button.value);
          
          
          if (active == "b")
          {
            fullProgram[fullProgram.length-1].data.push(2);
            fullProgram[fullProgram.length-1].state = "count";
          }
          else {
            
            
            //if (fullProgram.length > 1 )
              //fullProgram[fullProgram.length-1].analyzeState();
            // analyze the previouse spot
            fullProgram.push(new component("b","input"));
            
            fullProgram[fullProgram.length-1].state = "click";
            fullProgram[fullProgram.length-1].data.push(2);
            
            active = "b";
          }
          
          
          
          });
          
          sensor.on("down", function() {
           
            console.log("here");
            last = finalProgram();
            
            socket.emit('program', { raw: last });
            
           // eval("var button2; var led; button2 = new five.Button(5); led = new five.Led(3); button2.on(\"release\", function() {led.toggle();});");
            
           
            eval(last);
            //updateProgram("b",button.value)
            
            });
          
        lightSwitch.on("up", function() {
          
          
          
          
          
          if (active == "l")
          {
            //add to raw data array
            fullProgram[fullProgram.length-1].data.push(lightSwitch.value);
          }
          else {
            // analyze the previouse spot
           // fullProgram[fullProgram.length-1].analyzeState();
            fullProgram.push(new component("l","output"));
            fullProgram[fullProgram.length-1].data.push(lightSwitch.value);

            active = "l";
          }
          
          //console.log(lightSwitch.value);
          
          });
          
          lightSwitch.on("down", function() {
            
            
            if (active == "l")
            {
              //add to raw data array
              fullProgram[fullProgram.length-1].data.push(lightSwitch.value);
            }
            else {
              // analyze the previouse spot
              //fullProgram[fullProgram.length-1].analyzeState();
              fullProgram.push(new component("l","output"));
              fullProgram[fullProgram.length-1].data.push(lightSwitch.value);
              active = "l";
            }
            });
            
            
            
            
            sensorSwitch.on("down", function() {
              
            //  if (fullProgram.length > 1 )
              //fullProgram[fullProgram.length-1].analyzeState();
            // analyze the previouse spot
              
//              if (active == "lS")
//              {
//                //add to raw data array
//                fullProgram[fullProgram.length-1].data.push(lightSensor.value);
//                console.log(lightSensor.value);
//              }
//              else {
//                // analyze the previouse spot
//                fullProgram.push(new component("lS","input"));
//                fullProgram[fullProgram.length-1].data.push(lightSensor.value);
//                active = "lS";
//                console.log(lightSensor.value);
//
//              }


              
              
                            
              });
              
              
             
              servoFeedback.on("data", function() {
                
//                if (active == "servo")
//                {
//                  //add to raw data array
//                  if ( prev == this.value && !once){
//                    
//                    fullProgram[fullProgram.length-1].data.push(this.value);
//                    active = "servo";
//                    console.log("servo "+ this.value);
//                    once = true;
//                  }
//                  else if (!(this.value < prev + 10  && this.value > prev - 10 ) ){
//                    prev = this.value;
//                    once = false;
//                    
//                  }
//                }
//                else if(fullProgram.length!= 0) {
//                  // analyze the previouse spot
//                  
//                  
//     
//                  
//                  if ( prev == this.value && !once){
//                    
//                    fullProgram.push(new component("servo","output"));
//                    active = "servo";
//                    fullProgram[fullProgram.length-1].data.push(this.value);
//                    console.log("servo "+ this.value);
//                    once = true;
//                  }
//                  else if ( !(this.value < prev + 10  && this.value > prev - 10 )){
//                    prev = this.value;
//                    once = false;
//                    
//                  }
//                  
//
//
//
//                }
                
                
                
              });
              
              knob.on("change", function() {
                
                //console.log(">>>>>" + this.value);
                
                if (active == "knob")
                {
                  //add to raw data array
                  if ( prev == this.value && !once ){
                    
                    fullProgram[fullProgram.length-1].data.push(this.value);
                    active = "knob";
                    console.log("*"+this.value);
                    once = true;
                  }
                  else if (prev != this.value && prev != this.value +1 && prev != this.value-1 ){
                    prev = this.value;
                    once = false;
                    
                  }
                }
                else {
                  // analyze the previouse spot
                  
                  
                  if ( prev == this.value && !once){
                    
                    fullProgram.push(new component("knob","input"));
                    active = "knob";
                    fullProgram[fullProgram.length-1].data.push(this.value);
                    console.log("**"+this.value);
                    once = true;
                  }
                  else if (prev != this.value && prev != this.value +1 && prev != this.value-1 ){
                    prev = this.value;
                    once = false;
                    
                  }
                  



                }
                
                
                
              });
     
      
     
      
  }

//  // if servo message received
//  socket.on('servo', function (data) {
//    console.log(data);
//    if(board.isReady){ servo.to(data.pos);  }
//  });
//  // if led message received
//  socket.on('led', function (data) {
//    console.log(data);
//     if(board.isReady){    led.strobe(data.delay); } 
//  });

});


function finalProgram()
{
  for(var i=0;i<fullProgram.length ;i++)
  {
    fullProgram[i].analyzeState();
    
  }
  
  
  console.log(fullProgram);
  // assuming there is only one Input device and that this is on slice 
  
  
  var num_i = 0;
  var num_o = 0;
  
  var start = -1;
  var end = -1;
  
  var sliceProgram = [];
  var sliceNumber = 0;
  
  
  for(var i=0;i<fullProgram.length ;i++)
  {
    
    if (fullProgram[i].role === "input")
      num_i++;
    else {
      num_o++;
    }
    
    
    if (fullProgram[i].role === "input" && start == -1)
    {
      start = i ;
      
    }
    
    if (fullProgram[i].role === "output")
    {
      if (i != fullProgram.length -1 && fullProgram[i+1].role === "input" )
      {
        end = i;
        console.log("From " + start + " to " + end);
        sliceProgram[sliceNumber] = fullProgram.slice(start,end+1);
        sliceNumber++;
        start = -1;
      }
      else if (i == fullProgram.length -1)
      {
        end = i;
        console.log("From " + start + " to " + end);
        sliceProgram[sliceNumber] = fullProgram.slice(start,end+1);
        sliceNumber++;
        start = -1;
        
        
      }
    }
    
  }
  
  main[0] = "";
  
  for(var i=0;i<sliceProgram.length ;i++)
  {
    //console.log("Slice number " + i + " :" +  sliceProgram[i]);
    var current = sliceProgram[i];
    
    if((i != 0 && current[0].type!= sliceProgram[i-1][0].type ) || i ==0)
    {
      for(var j=0;j<current.length ;j++)
      {
        current[j].writelogic();
        
      }
    
      
      
       if(current[0].type == "b"){
            main[0] += buttonReleased.join(" ");
          }
       else if (current[0].type == "knob") {
            main[0] += knobChanged.join(" ");
          }
    }
      
    
    
  }
  
  

  
  
  
  
//  for(var i=0;i<fullProgram.length ;i++)
//  {
//    fullProgram[i].writelogic();
//    
//  }
  
//  if(fullProgram[0].type == "b"){
//    main[0] = buttonReleased.join(" ");
//  }
//  else if (fullProgram[0].type == "knob") {
//    main[0] = knobChanged.join(" ");
//  }
    

  
  
      
  
  
//  
//  if(num_i == 1)
//  {
//    //Call the writelogic function
//    //pair with output 
//    console.log("default case for knob");
//  }
//  
//  if(num_i == 2)
//  {
//    //call writelogicO on the first input
//    //Pair with output by calling writeLogicI 
//    
//    
//    
//  }
//  
//  if(fullProgram[0].type == "knob")
//  {
//  
//    if(num_i == 1)
//    {
//      console.log("Pair the knob value with the output");
//    }
//    
//    
//    if(num_i == 2)
//    {
//       
//      console.log(fullProgram[0].data.length);
//      if(fullProgram[0].data.length == 1 )
//      {
//        if (fullProgram[1].data[0] == 0)
//        {
//          var text = "the light will increse as the knob value ";
//          
//        }else {
//          
//          var text = "the light will decrese as the knob value ";
//
//        }
//        
//        if(fullProgram[0].data[0] > fullProgram[2].data[0])
//          text += "decrese";
//        else 
//          text +="increase"
//          
//        console.log(text);
//         
//       } else if (fullProgram[0].data.length == 2 )
//      {
//        
//         console.log("range from " + fullProgram[0].data[0] + " to " + fullProgram[0].data[1] + " LED will be " + fullProgram[1].data[0]   );
//        
//         console.log("range from " + fullProgram[0].data[1] + " to " + fullProgram[2].data[0] + " LED will be " + fullProgram[3].data[0]   );
//      }
//        
//    }
//  }
//  
//  
//  if(fullProgram[0].type == "lS")
//  {
//  
//    if(num_i == 1)
//    {
//      console.log("default case for light sensor (values will be tighed together)");
//    }
//    
//    if(num_i == 2)
//    {
//      
//      if(fullProgram[0].data.length == 1 )
//      {
//        
//        console.log("when the light value " +  fullProgram[0].data[0] +"+/- 10 LED will be " + fullProgram[1].data[0]);
//        console.log("when the light value " +  fullProgram[2].data[0] +"+/- 10 LED will be " + fullProgram[3].data[0]);
//         
//       } 
//        
//    }
//  }
  
  
  
  
  
//  var lightChange = 0; 
//  
//  for(var j=0;j<lightStates.length;j++)
//  {
//    
//    if (lightStates[j] != lightStates[j+1])
//    {
//      
//      lightChange++; 
//    
////      lightStates[j] = 2;
////      lightStates[j+1] = 2;
////      j++;
//
//    }
//   
//    
//  }
//  
//  var b = ""; 
//  var l = "";
//  for(var i=0; i<buttonStates.length; i++ )
//  {
//    b  = b + buttonStates[i] + " ";
//  }
//  
//  console.log(b);
//  
//  for(var i=0; i<lightStates.length; i++ )
//  {
//    l  = l + lightStates[i] + " ";
//  }
//  
//  console.log(l);
//  
//  var clicks =0;
//  var counts = 0;
//  var precounts = 0;
//  
//  for(var j=0;j<buttonStates.length;j++)
//  {
//    if(buttonStates[j] == 2 && buttonStates[j+1] !=2 )
//    {
//      counts++;
//      clicks++;
//
//      
//      
//
//      
//      if (clicks == 2 && precounts == counts)
//      {
//        //main[0] = buttonReleased;
//       
//          console.log("button toggle"); 
//          
//          console.log("change will be from:" +"to:");
//          
//          
//          
//        //console.log(main[0]);
//      }else {
//        
//        console.log(counts);
//        console.log("Action will change After " + counts);
//        console.log("The change is: ");
//        
//        if(lightStates[j+1] == lightStates[j+2] || j+2 >= buttonStates.length)
//        {
//          console.log("Not blink");
//        }
//        else {
//          console.log("blink");
//        }
//        
//      }
//      
//      precounts = counts;
//      counts =0;
//      
//      
//      
//    }
//    else if (buttonStates[j] != 0) {
//      
//      
//      
//      counts++;
//      console.log("count");
//      
//    }
//    
//    if(lightStates[j-1] == 1 && clicks == 2 )
//    {
//      console.log("led toggle");
//      
//      
//      
////      declarations += "var lightState=false;\n";
////      //console.log("lightState = !lightState;");
////      buttonReleased[1] = "led.toggle();\n"
//      
//      clicks = 0;
//    }
//    
//    
//    if(lightStates[j-1] == 2 && clicks == 2)
//    {
//      console.log("led blink");
//      
////      declarations += "var blinkState=false;";
////      buttonReleased[1] = "blinkState = !blinkState;\nif(blinkState)\nled.blink(500);\nelse{\nled.stop();\nled.off();\n}\n"
//      //console.log("blinkState = !blinkState;");
//      clicks = 0;
//    }
//  }
//  
//  
//  


  
  var last = declarations + init[0] + main.join(" ") ;
  
  console.log(last);
  return last;
  
}



var declarations = "var button2;\nvar led;\nvar knob2;\n";

var init = [];

init[0] = "button2 = new five.Button(5);\nled = new five.Led(6);\nknob2 = new five.Sensor(\"A2\");\n";

var main = [];

var buttonReleased = [];
buttonReleased[0] = "button2.on(\"release\", function() {\n";
buttonReleased[1] = "";
buttonReleased[2] = "});\n";

var knobChanged = [];

//knobChanged[0] = "knob2.scale([0, 255]).on(\"change\", function() {\n";
knobChanged[0] = "knob2.on(\"change\", function() {\n";
knobChanged[1] = "";
knobChanged[2] = "});\n";

