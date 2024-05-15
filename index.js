import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import env from "dotenv";

const app = express();
const port = 3000;
env.config();

const db = new pg.Client({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
});
db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

let currentUserId = 1;

async function checkVisisted() {
  const result = await db.query("SELECT country_code FROM visited_countries_family WHERE user_id=($1)", [currentUserId]); 
  let countries = [];
  result.rows.forEach((country) => {
    countries.push(country.country_code);
  });
  return countries;
};

async function checkUserColor(){
  let userColor = [];
  let result = await db.query("SELECT color FROM users WHERE id=($1)", [currentUserId]);
  result.rows.forEach((colors) => {
    userColor.push(colors.color);
  });
  return userColor;
};

async function checkUser(){
  let currentUser = [];
  let result = await db.query("SELECT * FROM users "); 
  currentUser = result.rows;
  return currentUser;
}


app.get("/", async (req, res) => {
  const countries = await checkVisisted();
  const color = await checkUserColor();
  const users = await checkUser();
  res.render("index.ejs", {
    countries: countries,
    total: countries.length,
    users: users,
    color: color
  });
});
app.post("/add", async (req, res) => {
  const input = req.body["country"];

  try {
    const result = await db.query(
      "SELECT country_code FROM countries WHERE LOWER(country_name) LIKE '%' || $1 || '%';",
      [input.toLowerCase()]
    );

    const data = result.rows[0];
    const countryCode = data.country_code;

    const visitedCountries = await db.query("SELECT country_code FROM visited_countries_family WHERE user_id=($1) AND country_code=($2)", [currentUserId, countryCode]);
    const visitedCountryCode = visitedCountries.rows[0]

    if (!visitedCountryCode) {
      try {  
        await db.query(
          "INSERT INTO visited_countries_family (country_code, user_id) VALUES ($1, $2)",
          [countryCode, currentUserId]
        );
        res.redirect("/");
      } catch (err) {
        console.log(err);
      }
    }
    else if (visitedCountryCode.country_code === countryCode){
      console.log("The country has already been added");
      res.redirect("/");
    } 
  } catch (err) {
    console.log(err);
    res.redirect("/");
  }
});

app.post("/user", async (req, res) => {
  let result = req.body
  if (result.add == "new") {
    console.log(result.add)
    res.render("new.ejs");
  } else {
    console.log(req.body);
  currentUserId = req.body.user
  res.redirect("/");
  }
});

app.post("/new", async (req, res) => {
  console.log(req.body);
  await db.query("INSERT INTO users (name, color) VALUES ($1, $2)", [req.body.name, req.body.color]);
  res.redirect("/");
  
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
