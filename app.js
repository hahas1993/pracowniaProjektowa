var express   =    require("express");
var mysql     =    require('mysql');
var app       =    express();

var pool      =    mysql.createPool({
    connectionLimit : 100,
    host     : 'sql5.freemysqlhosting.net',
    user     : 'sql577861',
    password : 'pW4%pX7%',
    database : 'sql577861',
    debug    :  false
});

app.use(express.cookieParser());
app.use(express.session({secret: '1234567890QWERTY'}));

// funkcje do bazy danych
function dbGetUsers(){
	pool.getConnection(function(err,connection){
        if (err) {
          connection.release();
          return;
        }   
		
        connection.query("select * from users",function(err,rows){
            connection.release();
            if(!err) {
				users = rows;
				console.log("dbGetUsers complete");
            }           
        });

        connection.on('error', function(err) {      
              return;     
        });
	});
}

function dbAddNewUser(user){
	pool.getConnection(function(err,connection){
        if (err) {
          connection.release();
          return;
        }   
        connection.query("INSERT INTO users SET ?", user, function(err, result){
            connection.release();
            if(!err) {
				console.log("dbAddNewUser complete");
            }           
        });
	});
}

function dbRandomQueries(res, game){
	pool.getConnection(function(err,connection){
        if (err) {
          connection.release();
          return;
        }   
		
        connection.query("SELECT * FROM questions ORDER BY RAND() LIMIT 2",function(err,rows){
            connection.release();
            if(!err) {
				game.queries = rows;
				waitingGames.push(game);
				res.json(game);
				console.log("dbRandomQueries complete");
            }		
        });

        connection.on('error', function(err) {      
              return;     
        });
	});
}

// funkcje do łaczenia z aplikacji
app.get("/registration",function(req,res){
	if(!checkLogin(req.query.login)){
		res.json("login occupied");
		return;
	}
	if(!checkEmail(req.query.email)){
		res.json("email occupied");
		return;
	}
	var user = {};
	user.login = req.query.login;
	user.email = req.query.email;
	user.password = req.query.password;
	user.rank = 0;
	user.won = 0;
	user.lost = 0;
	user.drawn = 0;
	users.push(user);
	dbAddNewUser(user);
	res.json("ok");
	return;
});

app.get("/login", function(req, res){
	var user = findUser(req.query.login);
	if(user == null){
		res.json("user not exists");
		return;
	}
	if(user.password != req.query.password){
		res.json("password incorrect");
		return;
	}
	if(!req.session.user){
		req.session.user = user;
		loginUser(user);
	}
	res.json("ok");
	return;
});

app.get("/logout", function(req, res){
	var user = req.session.user;
	if(user == null || user == undefined){
		res.json("user offline");
		return;
	}
	if(req.session.user){
		req.session.user = undefined;
		logoutUser(user);
	}
	res.json("ok");
	return;
});

app.get("/startrandomgame", function(req, res){
	if(!req.session.user){
		res.json("user offline");
		return;
	}
	var game = searchGame(req.session.user);
	if(game == null){
		game = createGame(req.session.user);
		-dbRandomQueries(res, game);
		return;
	}
	game.user2 = req.session.user;
	res.json(game);
	return;
});

//zmienne serwera
var users = [];
dbGetUsers();
var onlineUsers = [];
var waitingGames = [];
var games = [];

//funkcje pomocnicze
function createGame(user){
	var game = {};
	game.user1 = user;
	game.user2 = undefined;
	return game;
}

function searchGame(user){
	var game = null;
	for(var i=0; i<waitingGames.length; i++){
		if(game == null && user.login != waitingGames[i].user1.login){
			game = waitingGames[i];
			continue;
		}
		if(substrMod(user.rank, game.user1.rank) > substrMod(user.rank, waitingGames[i].user1.rank) && user.login != waitingGames[i].user1.login){
			game = waitingGames[i];
		}
	}
	return game;
}

function substrMod(a, b){
	if(a>b)
		return a-b;
	return b-a;
}

function logoutUser(user){
	console.log("log out "+user.login);
	for (var i=0; i<onlineUsers.length; i++) {
        if (onlineUsers[i].login === user.login) {
            onlineUsers.splice(i,1);
			return;
        }
    }
}

function loginUser(user){
	console.log("log in "+user.login);
	onlineUsers.push(user);
	return;
}

function findUser(login){
	for(var i=0; i<users.length; i++){
		if(users[i].login === login){
			return users[i];
		}
	}
	return null;
}

function checkLogin(login){
	for(var i=0; i<users.length; i++){
		if(users[i].login === login){
			return false;
		}
	}
	return true;
}

function checkEmail(email){
	for(var i=0; i<users.length; i++){
		if(users[i].email === email){
			return false;
		}
	}
	return true;
}

app.listen(4242);
console.log("server running on port 4242");