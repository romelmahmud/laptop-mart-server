const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();

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

async function run() {
  try {
    const categoriesCollection = client
      .db("laptopMart")
      .collection("categories");
    const usersCollection = client.db("laptopMart").collection("users");

    // get all categories
    app.get("/categories", async (req, res) => {
      const query = {};
      const result = await categoriesCollection.find(query).toArray();
      res.send(result);
    });

    // save user
    app.post("/users", async (req, res) => {
      const user = req.body;
      console.log(user.email);

      // find existing user
      const userQuery = {
        email: user.email,
      };
      const existingUser = await usersCollection.findOne(userQuery);
      if (existingUser) {
        res.send("User already exist");
        return;
      }
      // creating new user
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

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

    console.log("Database Connected...");
  } finally {
  }
}

run().catch((err) => console.error(err));

app.listen(port, () => {
  console.log(`Server is running...on ${port}`);
});
