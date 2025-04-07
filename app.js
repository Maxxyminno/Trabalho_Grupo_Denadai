const express = require("express"); // Adiciona o Express na sua aplicação
const session = require("express-session"); // Adiciona o gerencidor de sessões do Express
const sqlite3 = require("sqlite3"); // Adiciona a biblioteca para manipular arquivos do SQLite3

const app = express(); // Armazena as chamadas e propriedades da biblioteca EXPRESS

const PORT = 8000; // Configura a porta TCP do Express

// Configura a rota '/static' para a pasta `__dirname/static` do seu servidor 
app.use('/static', express.static(__dirname + '/static'));

app.set('view engine', 'ejs'); // Habilita a 'view engine' para usar o 'ejs'

// Rota '/' (raiz) para o método GET /
app.get("/", (req, res) => {
    console.log("GET /")
    // res.send("Alô SESI Sumaré<br>Bem-vindos ao SENAI Sumaré.");
    // res.send("<img src='./static/senai_logo.jfif' />");
    res.render("index");
})

// Rota '/sobre' para o método GET /sobre
app.get("/sobre", (req, res) => {
    console.log("GET /sobre");
    res.render("sobre");
})

// Rota '/dashboard' para o método GET /dashboard
app.get("/dashboard", (req, res) => {
    console.log("GET /dashboard")
    res.send("Você está na página DASHBOARD.");
})

app.listen(PORT, () => {
    console.log(`Servidor sendo executado na porta ${PORT}`);
    console.log(__dirname + "\\static");
});