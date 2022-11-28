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

// Collections
const categoriesCollection = client.db("laptopMart").collection("categories");
const usersCollection = client.db("laptopMart").collection("users");
const productsCollection = client.db("laptopMart").collection("products");

// middleware

// verify JWT
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
// verifySeller
const verifySeller = async (req, res, next) => {
  const decodedEmail = req.decoded.email;
  const query = { email: decodedEmail };
  const user = await usersCollection.findOne(query);

  if (user?.role !== "seller") {
    return res.status(403).send({ message: "forbidden access" });
  }
  next();
};

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
    // get category id by category name
    app.get("/categories/:categoryName", async (req, res) => {
      const categoryName = req.params.categoryName;
      const query = { name: categoryName };
      const result = await categoriesCollection.findOne(query);
      res.send(result._id);
    });

    // save user on Database
    app.post("/users", async (req, res) => {
      const user = req.body;
      console.log(user);
      // find existing user
      const userQuery = { email: user.email };
      const existingUser = await usersCollection.findOne(userQuery);
      if (existingUser) {
        res.send("User already exist");
        return;
      }

      user.varified = false;

      // creating new user
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    // Save products on DB
    app.post("/products", verifyJWT, verifySeller, async (req, res) => {
      const productsInfo = req.body;
      productsInfo.advertise = false;
      productsInfo.reported = false;
      const result = await productsCollection.insertOne(productsInfo);
      res.status(200).send(result);
    });

    // get all products by categories
    app.get("/category/products/:categoryId", verifyJWT, async (req, res) => {
      const categoryId = req.params.categoryId;
      console.log(categoryId);
      const query = { categoryId: categoryId };
      const result = await productsCollection.find(query).toArray();
      res.send(result);
    });

    // get all products by Seller
    app.get(
      "/seller/products/:email",
      verifyJWT,
      verifySeller,
      async (req, res) => {
        const email = req.params.email;
        // console.log(email);

        const query = { sellerEmail: email };
        const result = await productsCollection.find(query).toArray();
        res.status(200).send(result);
      }
    );

    // update product status (advertise to true)
    app.get(
      "/products/advertise/:productId",
      verifyJWT,
      verifySeller,
      async (req, res) => {
        const productId = req.params.productId;
        console.log(productId);
        const filter = {
          _id: ObjectId(productId),
        };
        const updateDoc = {
          $set: {
            advertise: true,
          },
        };
        const options = { upsert: true };

        const result = await productsCollection.updateOne(
          filter,
          updateDoc,
          options
        );
        res.status(200).send(result);
      }
    );

    // check is Admin
    app.get("/users/admin/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const user = await usersCollection.findOne(query);
      res.send({ isAdmin: user?.role === "admin" });
    });

    // check is Sellers
    app.get("/users/seller/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const user = await usersCollection.findOne(query);
      res.send({ isSeller: user?.role === "seller" });
    });

    // check if seller is varified
    app.get("/seller/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const user = await usersCollection.findOne(query);
      res.send({ isVerified: user?.varified === true });
    });

    // check is Buyer
    app.get("/users/buyer/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const user = await usersCollection.findOne(query);
      res.send({ isBuyer: user?.role === "buyer" });
    });
    console.log("Database Connected...");
  } finally {
  }
}

run().catch((err) => console.error(err));

app.listen(port, () => {
  console.log(`Server is running...on ${port}`);
});
