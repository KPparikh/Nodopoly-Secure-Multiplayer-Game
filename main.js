var express = require('express');
var https = require('https');
var fs = require('fs');
var app = express();

var server = https.createServer({
  key: fs.readFileSync('server.key'),
  cert: fs.readFileSync('server.crt'),
},app);


var io = require('socket.io').listen(server);

var helmet = require('helmet');
var csrf = require('csurf');
var bodyParser = require('body-parser');
//var mongoose = require('mongoose');
var mysql = require('mysql');
var session = require('express-session');
var path = require('path');
var morgan = require('morgan')
var cors = require('cors')
var bcrypt = require('bcrypt');
var validator = require('express-validator');

//Jade
app.use(express.static(path.join(__dirname,'public')));
app.set('view engine', 'jade');
app.set('views', __dirname + '/public/views');
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');
app.use('/monopoly', express.static(__dirname + "/monopoly"));

app.use(morgan('combined'));
app.use(cors());
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended: false}));

app.use(validator());
app.use(session({
  cookieName: 'cqsession',
  secret: 'asdfqwer1234wqedfasdfa',
  saveUninitialized: false,
  resave: false,
  cookie: { 
    maxAge: 1800000,
    secure: true,
    httpOnly: true 
  },
}));

app.use(helmet());
app.use(helmet.noCache());
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'",'wss://localhost:3000'],
    styleSrc: ["'self'","'unsafe-inline'"],
  }, setAllHeaders: true,
}));
app.use(helmet.noSniff());
app.use(helmet.referrerPolicy({ policy: 'same-origin' }));

//Password Hashing
var saltRounds = 11;


//var email=req.body.email;



//Database
var con = mysql.createConnection({
  host: "monopoly.ccvh75yxsbaq.us-east-1.rds.amazonaws.com",
  user: "monopoly",
  password: "monopoly",
  database: "monopoly",
  multipleStatements: true
});

con.connect(function(err) {
  if (err) throw err;
  console.log("Connected to Database!");
 // var sql = 'CREATE TABLE IF NOT EXISTS user (name CHAR(255), email VARCHAR(255) PRIMARY KEY, password VARCHAR(255)); CREATE TABLE IF NOT EXISTS countries (id INTEGER AUTO_INCREMENT, country VARCHAR(255), capital VARCHAR(255), PRIMARY KEY(id) ); CREATE TABLE IF NOT EXISTS stats(email VARCHAR(255) PRIMARY KEY, wins INTEGER, losses INTEGER); CREATE TABLE IF NOT EXISTS game (game_id INTEGER, email VARCHAR(255), CONSTRAINT PK_Game PRIMARY KEY (game_id, email)); CREATE TABLE IF NOT EXISTS gamescores (game_id INTEGER, email VARCHAR(255), q1 INTEGER, q2 INTEGER, q3 INTEGER, q4 INTEGER, q5 INTEGER, q6 INTEGER, q7 INTEGER, q8 INTEGER, q9 INTEGER, q10 INTEGER, FOREIGN KEY(game_id, email) REFERENCES game(game_id, email)); CREATE TABLE IF NOT EXISTS gamemoves (game_id INTEGER, email VARCHAR(255), a1 VARCHAR(255), a2 VARCHAR(255), a3 VARCHAR(255), a4 VARCHAR(255), a5 VARCHAR(255), a6 VARCHAR(255), a7 VARCHAR(255), a8 VARCHAR(255), a9 VARCHAR(255), a10 VARCHAR(255), FOREIGN KEY(game_id, email) REFERENCES game(game_id, email) ); CREATE TABLE IF NOT EXISTS gq (game_id INTEGER, id INTEGER, FOREIGN KEY(id) REFERENCES countries(id));';
  var sql = 'CREATE TABLE IF NOT EXISTS Users (name CHAR(255), email VARCHAR(255) PRIMARY KEY, password VARCHAR(255)); CREATE TABLE IF NOT EXISTS Countries (country_id INTEGER PRIMARY KEY, country VARCHAR(255), capital  VARCHAR(255)); CREATE TABLE IF NOT EXISTS Game (game_id INTEGER, email1 VARCHAR(255), email2 VARCHAR(255), CONSTRAINT PK_Game PRIMARY KEY (game_id)); CREATE TABLE IF NOT EXISTS Stats (email VARCHAR(255) PRIMARY KEY, wins INTEGER, losses INTEGER); CREATE TABLE IF NOT EXISTS GameScores (game_id INTEGER, email VARCHAR(255), question_no INTEGER, point INTEGER, FOREIGN KEY(game_id) REFERENCES Game(game_id)); CREATE TABLE IF NOT EXISTS GameMoves (game_id INTEGER, email VARCHAR(255), answer_no INTEGER, answer_attempt VARCHAR(255), FOREIGN KEY(game_id) REFERENCES Game(game_id)); CREATE TABLE IF NOT EXISTS GameQuestions (game_id INTEGER, country_id INTEGER, question_no INTEGER, FOREIGN KEY(country_id) REFERENCES Countries(country_id));';
  con.query(sql, function (err, result) {
    if (err) throw err;
    console.log("All tables created!");
  });
});

//Sleep function
function sleep(seconds){
  var waitUntil = new Date().getTime() + seconds*1000;
  while(new Date().getTime() < waitUntil) true;
};

//Socket Events
var AllGames = {};
var globalStats = [];

var c;
io.on('connection', function (socket) {
  console.log("User "+ socket.id + " connected"); 

  io.sockets.connected[socket.id].emit('takeStats', globalStats);
  
  socket.on('disconnect', function(){
    setTimeout(function () {
      console.log("User "+ socket.id +" disconnected!");
    }, 10000);
  });

  socket.on('chat message', function(msg){
    console.log('message: ' + msg);
    io.emit('chat message', msg);
  });

  var list = io.sockets.sockets; 
  console.log("Connected sockets:"); 
  Object.keys(io.sockets.sockets).forEach(function(id){ 
    console.log("ID: ",id);
  }); 

 
    socket.on('createGameRoom', function(data){
    var thisGameId = (Math.random() * 100000) | 0;
    var email = data.email;
    socket.emit('newGameRoomCreated', {'gRoomId': thisGameId, 'mySocketId': socket.id, 'numPlayersInRoom': 1});
    console.log('GameRoomCreated: '+thisGameId+" user email: ");
    socket.join(thisGameId.toString());
    //var numPlayersInRoom = 1;
    AllGames[thisGameId] = 1;
    //db insert for above logic

    var sql = "INSERT INTO Game VALUES (?, ?, ?);";
    var inserts = [thisGameId, email, ''];
    sql = mysql.format(sql, inserts);
    con.query(sql,function(err){
      if(err){
        console.log("error creating Game record");
       } // handle else case with success code from SQL success codes.
    });

    for(var i=0; i < 10; i++){
      var sql = "INSERT INTO GameMoves(game_id, email, answer_no) VALUES(?, ?, ?)";
      var inserts = [thisGameId, email , i];
      sql = mysql.format(sql, inserts);
      con.query(sql,function(err){
        if(err){
          console.log(err);      
        }
      });
    };
  });

  socket.on('imBack',function(data){
    socket.join(data.gRoomId);
    io.to(data.gRoomId).emit('startTimer2');
  });

  socket.on('sendGameHistory', function(data){
    var email = data.email;
    var socketId = data.socketId;
    
    var sql = "SELECT DISTINCT d.answer_no AS 'Questions', c.country AS 'Country', c.capital AS 'CorrectAnswer', f.name AS 'Player1', d.answer_attempt AS 'Player1-Answer', h.point AS 'Player1-Points', g.name AS 'Player2', e.answer_attempt AS 'Player2-Answer', i.point AS 'Player2-Points' FROM Game a LEFT OUTER JOIN GameQuestions b ON a.game_id = b.game_id LEFT OUTER JOIN Countries c ON b.country_id = c.country_id LEFT OUTER JOIN GameMoves d ON (a.game_id = d.game_id) AND (a.email1 = d.email) AND (d.answer_no = b.question_no) LEFT OUTER JOIN GameMoves e ON (a.game_id = e.game_id) AND (a.email2 = e.email) AND (e.answer_no = b.question_no) LEFT OUTER JOIN GameScores h ON (a.game_id = h.game_id) AND (a.email1 = h.email) AND (d.answer_no = h.question_no) LEFT OUTER JOIN GameScores i ON (a.game_id = i.game_id) AND (a.email2 = i.email) AND (d.answer_no = i.question_no) LEFT OUTER JOIN Users f ON d.email = f.email AND f.email = a.email1 LEFT OUTER JOIN Users g ON e.email = g.email AND g.email = a.email2 WHERE a.game_id IN (SELECT game_id FROM Game WHERE (game_id IS NOT NULL) AND (email1 = (?) OR email2 = (?)));";
    var inserts = [email, email];
    sql = mysql.format(sql, inserts);
    console.log("query gameHistory: "+sql);
    con.query(sql, function(err, results){
      if(err){
        console.log(err);
      }
      console.log(JSON.stringify(results));
      socket.emit('takeGameHistory', JSON.stringify(results));
      console.log("emitted takeGameHistory");  
    });  
  });

  socket.on('listGameRooms', function(){
    socket.emit('sendGameRooms', AllGames);
  });

  socket.on('joinTo', function(content){
    var gRoomId = content.gRoomId;
    var email = content.email;
    socket.join(gRoomId);
    var info = {
                  'gRoomId': gRoomId,
                  'mySocketId': socket.id, 
                  'numPlayersInRoom': 2, 
                  'roundCount': 0, 
                  'resume':0
                };
    AllGames[gRoomId] = 2;
    socket.emit('updateGameInfo', info);
    

    var sql = "UPDATE Game SET email2 = (?) Where game_id = (?)";
    var inserts = [email, gRoomId];
    sql = mysql.format(sql, inserts);
    con.query(sql,function(err){
      if(err){
        console.log("error creating Game record");
       }
    });

    io.to(gRoomId).emit('startTimer');
    

  });

  socket.on('cResumeGame', function(data){
    var email = data.email;
    io.sockets.connected[socket.id].emit('resumeTest', 'hello');
    io.sockets.emit("pauseGame", email);

    var sql = "SELECT game_id from GameMoves WHERE email= (?) AND (answer_no = 9 AND answer_attempt IS NULL)";
    var inserts = [email];
    var eGRoomId;
    sql = mysql.format(sql, inserts);
          con.query(sql,function(err, results){
            if(err){
              console.log(err);      
            }
            eGRoomId = results[0].game_id;


            var sql = "SELECT MAX(question_no) AS rcount FROM GameScores WHERE email = (?) AND game_id = (?)";
            var inserts_intoGame = [email, eGRoomId];
            var eRoundCount;
            sql = mysql.format(sql, inserts_intoGame);
                  con.query(sql,function(err, results){
                    if(err){
                      console.log(err);      
                    }
                    eRoundCount = results[0].rcount;
                    //console.log("eRoundCount: "+eRoundCount);
            });


          });
  });

});

//Routes

app.get('/', function(req,res){
  res.render('index.jade');
});

app.get('/register', function(req, res){

  res.render('register.jade');
});

app.post('/register', function(req, res) {
  //validate name, email, password input
  var name = req.body.name;
  var email = req.body.name;
  var password = req.body.name;

  req.checkBody('name', 'Name is required field!').notEmpty();
  req.checkBody('name', 'Name Should be atleast 2 Character!').isLength({min: 2 });
  req.checkBody('email', 'Email Address is required!').notEmpty();
  req.checkBody('email', 'Please Enter a valid Email address!').isEmail();
  req.check('password', 'Password must be at least 8 characters long!').isLength({ min: 8 });
    
  var errors = req.validationErrors();

  var sql = "INSERT INTO Stats VALUES(?, ?, ?)";
  var inserts = [req.body.email, 0, 0];
  sql = mysql.format(sql, inserts);
  con.query(sql, function(err){
    if(err){
      console.log(err);
    }
  });

  if(errors){
    console.log(errors);
    return res.render('register.jade', {error: errors});
  }

  bcrypt.hash(req.body.password, 11, function(err, hPassword){
    if(err){
      console.log(err);
    }
    var sql = "INSERT INTO Users VALUES(?, ?, ?)";
    var inserts = [req.body.name, req.body.email, hPassword];
    sql = mysql.format(sql, inserts);
    con.query(sql,function(err){
      if(err){
        var error = 'Something bad happened! Please try again.';
        if(err.code === 'ER_DUP_ENTRY'){
          error = 'That email is already taken, please try another.'
        }
        res.render('register.jade', {error: error});
      }
      else{
        res.redirect('/login');
      }
    });
  });
});

app.get('/login', function(req, res){
  if(req.session && req.session.email){
    var sql = "SELECT * from Users where email = ?";
    var inserts = [req.session.email];
    sql = mysql.format(sql, inserts);
    
    con.query(sql, function(err, results, fields){
      if(results.length < 0){
        req.session.destroy();
        //res.locals.csrfToken = req.csrfToken();
        res.render('/login');
      }
      else{
        res.locals.email = results[0].email;
        res.locals.name = results[0].name;
        res.render('dashboard.jade');
      }
    });
  }
  else {
  //res.locals.csrfToken = req.csrfToken();  		
  res.render('login.jade');
  }
});

app.post('/login', function(req, res){
  var email = req.body.name;
  var password = req.body.name;

  req.checkBody('email', 'Invalid email or password!').notEmpty();
  req.checkBody('email', 'Invalid email or password!').isEmail();
  req.check('password', 'Invalid email or password!').isLength({ min: 8 });
    
  var errors = req.validationErrors();

  if(errors){
    console.log(errors);
    return res.render('login.jade', {error: errors});
  }

  var sql = "SELECT a.name, b.wins, b.losses FROM Users a JOIN Stats b ON a.email = b.email;";
  con.query(sql, function(err, results){
    if(err){
      console.log(err);
    }
    globalStats = JSON.stringify(results);
    console.log(globalStats);

  });

  var sql = "SELECT * FROM Users WHERE email = ?";
  var inserts = [req.body.email];
  sql = mysql.format(sql,inserts);
  console.log("login query: ",sql);
  con.query(sql, function(err, results, fields){
    if(err){
      console.log(err);
      return res.render('login.jade', {error:'Invalid email or password!'});
    }
    else{
      console.log('no error, checking results length, results.length: '+results.length);
      if(results.length > 0){
        bcrypt.compare(req.body.password, results[0].password, function(err, fin){
          if(!fin){
            console.log('passwords do not match');
            return res.render('login.jade',{error: 'Invalid email or password!'});
          }
          console.log('passwords match');
          req.session.email = req.body.email;
          req.session.name = results[0].name;
          return res.redirect('/dashboard');
        });
      }
      else{
        res.render('login.jade',{error: 'Invalid email or password!'});
      }
    }  
  });
});

app.get('/dashboard', function(req, res){
  if(req.session && req.session.email){
    var sql = "SELECT * from Users where email = ?";
    var inserts = [req.session.email];
    sql = mysql.format(sql, inserts);
    con.query(sql, function(err, results, fields){
      if(results.length < 0){
        req.session.destroy();
        res.redirect('/login');
      }
      else{
        res.locals.email = results[0].email;
        res.locals.name = results[0].name;
        res.render('dashboard.jade');
      }
    });
  }
  else{
    res.redirect('/login');
  }
});    

app.get('/logout', function(req, res){
  req.session.destroy();
  res.redirect('/');
});

app.get('/monopoly', function(req, res) {
  //viewname can include or omit the filename extension
  res.render(__dirname + '/monopoly/index.html'); 
});

var port = process.env.PORT || 3000;
server.listen(port);
console.log("Server is listening on "+ port);