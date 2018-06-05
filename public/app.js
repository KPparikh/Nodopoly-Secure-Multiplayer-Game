var socket = io.connect("https://localhost:3000");
var App = { gRoomId: 0, 
            pEmail: "",
            pName: "",
            mySocketId: 0, 
            numPlayersInRoom: 0, 
            roundCount: 0, 
            currCountry: 0,
            totalScore: 0, 
            
};

var score = [0,0,0,0,0,0,0,0,0,0,0];
var allCountries = [];
var localStats = [];
var gameSummary = [];
var gameHistory = [];

socket.on('newGameRoomCreated', function(data){
  App.gRoomId = data.gRoomId;
  App.mySocketId = data.mySocketId;
  App.numPlayersInRoom = data.numPlayersInRoom;
  App.points = 0;
  $(".options").hide();
  $(".waitMsg").show();
});

socket.on('sendGameRooms', function(AllRooms){
  $(".options").hide();
  $(".joinMsg").show();
  
  for(var i in AllRooms){
    if(AllRooms[i] < 2){
      $("<input type='radio' name='radiobtn' value="+ i +">"+ i +"</input><br/>").appendTo("#roomList");
    }
  } 
  console.log(AllRooms);
  $("#jRoomBtn").show();
});



socket.on('updateGameInfo', function(info){
  App.gRoomId = info.gRoomId;
  App.mySocketId = info.mySocketId;
  App.numPlayersInRoom = info.numPlayersInRoom;
  App.roundCount = info.roundCount;
  console.log(info);

  if(info.resume === 1){
    var countryInfo = {
                        'countryId': allCountries[App.roundCount],
                        'sid': App.mySocketId,
                        'gRoomId': App.gRoomId,                        
                        'roundCount':App.roundCount
                      };
    socket.emit('imBack', {"gRoomId": App.gRoomId, "mySocketId":App.mySocketId});
  }
});

socket.on('startTimer',function(){
  var $timeLeft = $("#countDown");
  countDowner($timeLeft, 2, syncUs)
}); 

socket.on('startTimer2',function(){
  $("#FieldAns").hide();
  $("#content").hide();
  $(".waitMsg").hide();
  //console.log('countDowner called');
  var $timeLeft = $("#countDown");
  countDowner($timeLeft, 2, autoResumeGame)
}); 

function Redirect() {
  window.location.replace("/monopoly");
}

function syncUs(){

    document.write("You will be redirected to main page in 10 sec.");
    setTimeout(Redirect(), 10000);

};

function callSendQuestion(countryInfo){
  socket.emit('sendQuestion', countryInfo);
};

socket.on('takeAllCountries', function(countries_id){
  allCountries = countries_id;

});


socket.on('sendGameData', function(data){
  console.log('emitted takeGameData');
  socket.emit('takeGameData',{"email":App.pEmail, "gRoomId":App.gRoomId, "socketId":App.mySocketId});
});


socket.on("pauseGame",function(email){
  if(email !== App.pEmail)
  {
    $.toast().reset('all');
    $(".waitMsg").text("Wait for second Player to rejoin!")
    $(".waitMsg").show();
  }
});

function autoResumeGame(){
  var countryInfo = { 
                      'countryId': allCountries[App.roundCount], 
                      'gRoomId ': App.gRoomId, 
                      'sid': App.mySocketId, 
                      'roundCount':App.roundCount
                    };
  callSendQuestion(countryInfo);
  
};

socket.on('resumeTest',function(data){
  console.log('resumeTest was hit!'+data);
});

socket.on('takeGameHistory', function(data){
  gameHistory = data;
  $("#stats-table").hide();
  $("#content").hide();
  $("#gSum-table").hide();
  $("#gHistory-table").show();
  $("#gHistory-table").tabulator("setData", gameHistory);

});

var createRoom = function(){
  socket.emit('createGameRoom', {"email":App.pEmail});
  console.log('emitted createGameRoom');
};

var listGameRooms = function(){
  socket.emit('listGameRooms');
  console.log('emitted listGameRooms');
};

var joinRoom = function(){
  var gRoomId = $("input:radio:checked").val();
  App.gRoomId = gRoomId;
  console.log('->value now: '+App.gRoomId);
  var content = {'gRoomId': App.gRoomId, 'email': App.pEmail};
  console.log("Value of gRoodId:  "+gRoomId);
  socket.emit('joinTo', content);
  $(".joinMsg").hide();
  $("#roomList").hide();
  console.log('GRoomId sent to Join: '+$("input:radio:checked").val());
};


function countDowner( $element, startTime, callback) {
  $(".waitMsg").hide();
  $element.show();
  $element.text(startTime);
  var timer = setInterval(countItDown,1000);
  function countItDown(){
    startTime -= 1
    $element.text(startTime);
    if( startTime <= 0 ){

      clearInterval(timer);
      callback();
      $element.hide();
      return;
    }
  }
};


function cResumeGame(){
  var data = {'email':App.pEmail};
  console.log('emitting checkResumeGame');
  socket.emit('cResumeGame',data);
  
};

function fetchStats(){
  console.log('emitting fetchStats.');
  //handle logic for display on UI
};

function test(){
  console.log("test hit!");
};
$(function(){
  $("#cRoomBtn").one('click',function(){
    createRoom();
  });

  $("#lRoomBtn").one('click',function(){
    listGameRooms();
  });

  $("#jRoomBtn").one('click',function(){
    joinRoom();
  });
  
  $("#rGameBtn").one('click',function(){
    console.log('resume btn clicked');
    cResumeGame();
  });

  $("#gPlayNow").bind('click',function(){
    console.log("Play now Clicked!");
    $("#content").show();
    $("#gSum-table").hide();
    $("#stats-table").hide();
    $("#qOne").hide();
    $("#FieldAns").hide();
    $("#roomList").hide();
    $("#gHistory-table").hide();
    $("#content").show();
  });

  $("#sendAnsBtn").bind('click',function(){
   //
      // submitAnswer();
  });

  App.pEmail = $("#hEmail").text();
  console.log('Created global email variable: '+App.pEmail);

  App.pName = $("#hName").text();
  console.log('Created global name variable: '+App.pName);
});

$(document).ready(function() {
  $('#sendAnsBtn').attr('disabled','disabled');
  $('#ansInput').keyup(function() {
     if($(this).val() != '') {
       //console.log('submit btn toggled!');
        $('#sendAnsBtn').removeAttr('disabled');
     }
     else{
      $('#sendAnsBtn').attr('disabled','disabled');
     }
  });

});
