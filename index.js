const express = require('express')
const dotenv = require('dotenv');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');
const { createRemoteJWKSet, jwtVerify } = require('jose-cjs');
const port = process.env.PORT || 8080
dotenv.config();
const app = express()
app.use(cors());
app.use(express.json());


const uri =process.env.MONGODB_URL;

const JWKS = createRemoteJWKSet(new URL(`${process.env.CLIENT_URL}/api/auth/jwks`));


// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

const logger = (req,res,next)=>{
           console.log(`${req.method} | ${req.url}`);
          next();
       };

const verifyToken = async (req, res, next) =>{
   const { authorization } = req.headers;
  // console.log(req.headers,"from token");
   const token = authorization?.split(' ')[1];
    // console.log(token);

      if (!token) {
    return res.status(401).json({ message: 'Unauthorize' });
  }
 
  try {
    const JWKS = createRemoteJWKSet(new URL('http://localhost:3000/api/auth/jwks'));
    const { payload } = await jwtVerify(token, JWKS);
    // console.log(payload)
    req.user = payload;

    next();
  } catch (error) {
    console.error('Token validation failed:', error);
    return res.status(401).json({ message: 'Unauthorize' });
  }
};       


async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });

        const db = client.db('databasedb');
    const coursesCollection = db.collection('collection');
    const userIdeaCollection = db.collection('userIdea');

    //    app.get('/course', async (req, res) => {
    //     const cursor = coursesCollection.find()
    //   const result = await cursor.toArray();
    //   res.send(result);
    //     res.send(result)
    // });
       app.get('/course', async (req, res) => {
        // console.log(req.query)
         const { search } = req.query;
         
         let cursor;
         if(search){
         cursor = await coursesCollection.find({
          $or: [
            {
              title: {
                $regex: search,
                $options: 'i',
              },
            },
            {
              category: {
                $regex: search,
                $options: 'i',
              },
            },
          ],
        });
         }
         else{
           cursor = coursesCollection.find();
         }
      const result = await cursor.toArray();
        res.send(result)
    });

       app.get('/featured', async (req, res) => {
      const cursor = coursesCollection.find().limit(6);
      const result = await cursor.toArray();
      res.send(result);
    });

       app.get('/course/:dataId',logger,verifyToken,async (req, res) => {
        const {dataId} = req.params
        // console.log(dataId)
           console.log(req.user, 'req');
        const query = {_id: new ObjectId(dataId)}
        const result = await coursesCollection.findOne(query)
        res.send(result)
    });

    app.get('/ideas', async(req, res)=>{
        const result = await userIdeaCollection.find().toArray()
        res.json(result)
    })

    app.post('/ideas', async(req, res)=>{
      const userIdea = req.body
        console.log(userIdea)
        const result = await userIdeaCollection.insertOne(userIdea)
        res.json(result)
    });

     app.patch('/ideas/:id',async (req, res) => {
           const { id } = req.params;
      const myIdeaData = req.body;
      console.log(myIdeaData);

      const result = await userIdeaCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: myIdeaData},
      );

      res.json(result);
     });

    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Hello world')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
