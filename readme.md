A Secure Multiplayer Monopoly Game In which multiple Player can Login and Play on Single Game!! At max 8 player can play a single Game.

You need Node npm version 8.11 or higher.

After pulling repository go to Directory of Main.js and run command "npm install".

I have used AWS RDS MySQL Database Schema which is not running on my AWS now so, You need to create your own MySQL Database on localmachine or anywhere. After creating Database update credentials in main.js

Main purpose of this Project was to Develop Secure Software Implementation so We didn't pay that much attention to Front-end.

We have used Express.js as framework of our Game. Some modules that we have used for Security implementations are Express-handle, express-https, that made our Web-application really secure.

Explicitly SSL and TLS are also implemented for Secure Login and Login credentials Encryption (Hash-Salt, Salt 11). Install server.crt certificate on your machine to enable Secure{https} Connection.

Any suggestion or contribute requests will always be appriciated.

Happy Playing.

