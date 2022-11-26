const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const jwt = require("jsonwebtoken");

const app = express();
const port = process.env.PORT || 8000;

// middlewares
app.use(cors());
app.use(express.json());

// Database Connection
const uri = process.env.DB_URI;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

// verify
function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send("unauthorized access");
  }

  const token = authHeader.split(" ")[1];

  jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: "forbidden access" });
    }
    req.decoded = decoded;
    next();
  });
}

// Collections
const categoriesCollection = client.db("laptopMart").collection("categories");
const usersCollection = client.db("laptopMart").collection("users");
const productsCollection = client.db("laptopMart").collection("products");

async function run() {
  try {
    // create json web token

    app.get("/jwt", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      if (user) {
        const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, {
          expiresIn: "7d",
        });
        return res.send({ accessToken: token });
      }
      res.status(403).send({ accessToken: "" });
    });

    // get all categories
    app.get("/categories", async (req, res) => {
      const query = {};
      const result = await categoriesCollection.find(query).toArray();
      res.send(result);
    });

    // save user on Database
    app.post("/users", async (req, res) => {
      const user = req.body;
      console.log(user.email);

      // find existing user
      const userQuery = { email: user.email };
      const existingUser = await usersCollection.findOne(userQuery);
      if (existingUser) {
        res.send("User already exist");
        return;
      }
      // creating new user
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    // Save products on DB

    app.post("/products", async (req, res) => {
      const productsInfo = req.body;
      const result = await productsCollection.insertOne(productsInfo);
      res.status(200).send(result);
    });

    console.log("Database Connected...");
  } finally {
  }
}

run().catch((err) => console.error(err));

app.listen(port, () => {
  console.log(`Server is running...on ${port}`);
});
