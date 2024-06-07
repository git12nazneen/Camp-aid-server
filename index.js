const express = require('express');
const cors = require('cors');
require('dotenv').config();
const app = express()
const jwt = require('jsonwebtoken');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
const port = process.env.PORT || 5000;


app.use(
    cors({
      origin: [
        "http://localhost:5173",
        "http://localhost:5174",
        // "https://nourish-hub-efad9.web.app",
        // "https://nourish-hub-efad9.firebaseapp.com",
      ],
      credentials: true,
    })
  );
  // app.use(cors());
  app.use(express.json());

  const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
  // const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.rmgdsvn.mongodb.net/?retryWrites=true&w=majority&appcampName=Cluster0`;
  
  const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.rmgdsvn.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

  // Create a MongoClient with a MongoClientOptions object to set the Stable API version
  const client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    }
  });
  
  async function run() {
    try {
      // Connect the client to the server	(optional starting in v4.7)
      await client.connect();
      // Send a ping to confirm a successful connection
        const addUserCollection = client.db('campAid').collection('users')
        const addCampCollection = client.db('campAid').collection('camps')
        const addParticipantCollection = client.db('campAid').collection('participant')
        const addPaymentCollection = client.db('campAid').collection('payments')



    //jwt related api
    app.post('/jwt', async(req, res)=>{
        const user = req.body;
        const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
          expiresIn:'1h'
        });
        res.send({token})
      }) 
  
  
      // middleweares
      const verifyToken = (req, res, next) =>{
        console.log('inside verifty token', req.headers.authorization);
        if(!req.headers.authorization){
          return res.status(401).send({message:'unauthorized access'})
        }
        const token = req.headers.authorization.split(' ')[1];
       jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded)=>{
        if(err){
          console.log({err})
          return res.status(401).send({message:'unauthorized access'})
        }
        req.decoded = decoded;
        next()
       })
      }
     
  
    // use verify admin after verify token
    const verifyAdmin = async(req, res, next)=>{
      const email = req.decoded.email;
      const query = {email: email};
      const user = await addUserCollection.findOne(query)
      const isAdmin = user?.role === 'admin';
      if(!isAdmin){
        return res.status(403).send({message: 'forbidden access'});
      }
      next()
    }
  
      
        // auth related

        app.post('/users', async(req, res)=>{
            const user = req.body;
            const query = {email: user.email}
            const existingUser = await addUserCollection.findOne(query)
            if(existingUser){
              return res.send({message: 'user already exists', insertId: null})
            }
            const result = await addUserCollection.insertOne(user)
            res.send(result);
          })

          app.get('/users/admin/:email',verifyToken, async(req, res)=>{
            const email = req.params.email;
            if(email !== req.decoded.email){
              return res.status(403).send({message: 'forbidden access'})
            }
            const query = {email: email};
            const user = await addUserCollection.findOne(query);
            let admin = false;
            if(user){
              admin = user?.role === 'admin';
            }
            res.send({admin})
          })

        app.get('/users',verifyToken, verifyAdmin, async (req, res) => {
            try {
                const query = addUserCollection.find()
              const result = await query.toArray();
              res.send(result);
            } catch (error) {
              console.error('Error fetching users:', error);
              res.status(500).send('Error fetching users');
            }
          });


          app.patch('/users/admin/:id',verifyToken, verifyAdmin, async(req, res)=>{
            const id = req.params.id;
            const filter = {_id: new ObjectId(id)};
            const updatedDoc = {
              $set:{
                role:'admin'
              }
            }
            const result = await addUserCollection.updateOne(filter, updatedDoc)
            res.send(result);
          })
      
          app.delete('/users/:id',verifyToken, verifyAdmin, async(req, res)=>{
            const id = req.params.id;
            const query = {_id : new ObjectId(id)}
            const result = await addUserCollection.deleteOne(query);
            res.send(result)
          })




          // camp data

          app.post('/camps', verifyToken, verifyAdmin, async (req, res)=>{
            const item = req.body;
            const result = await addCampCollection.insertOne(item);
            res.send(result)
          })

          app.get('/camps', async(req, res)=>{
            const result = await addCampCollection.find().toArray()
            res.send(result);
        })

        //   app.get('/camps/:id', async(req, res)=>{
        //   const id = req.params.id;
        //   const query= {_id : new ObjectId(id)}
        //   const result = await addCampCollection.findOne(query)
        //   res.send(result)
        // })

        app.get('/camps/:id', async (req, res) => {
          const id = req.params.id;
          console.log(`Received ID: ${id}`); // Log the received ID for debugging
        
          if (!ObjectId.isValid(id)) {
            return res.status(400).send({ error: 'Invalid ID format' });
          }
        
          const query = { _id: new ObjectId(id) };
        console.log(query)
          try {
            const result = await addCampCollection.findOne(query);
        
            if (!result) {
              return res.status(404).send({ error: 'Camp not found' });
            }
        
            res.send(result);
          } catch (err) {
            console.error('Error fetching camp details:', err);
            res.status(500).send({ error: 'Internal server error' });
          }
        });

        app.delete('/camps/:id', verifyToken, verifyAdmin, async(req, res)=>{
          const id = req.params.id;
          const query = {_id: new ObjectId(id)}
          const result = await addCampCollection.deleteOne(query)
          res.send(result);
        })

        app.patch('/camps/:id', async(req, res)=>{
          const items = req.body;
          const id = req.params.id;
          const filter = {_id: new ObjectId(id)}
          const updatedDoc={
            $set:{
              campName: items.campName,
              location: items.location,
              professionalName: items.professionalName,
              price: items.price,
            }
          }
          const result = await addCampCollection.updateOne(filter, updatedDoc)
          res.send(result) 
        })

         app.put('/camps/:id', async (req, res) => {
        const campId = req.params.id;
        const filter = { _id: new ObjectId(campId) };
        const updateDoc = { $inc: { guests: 1 } };
      
        try {
          // Update the camp document by incrementing the guests count
          const result = await addCampCollection.updateOne(filter, updateDoc);
      
          if (result.modifiedCount === 0) {
            return res.status(404).send('Camp not found');
          }
      
          res.send({ message: 'Camp updated successfully' });
        } catch (error) {
          console.error('Error updating camp data:', error);
          res.status(500).send('Error updating camp data');
        }
      });


        // particapant 

        app.post('/participant', verifyToken, async (req, res)=>{
          const item = req.body;
          const result = await addParticipantCollection.insertOne(item);
          res.send(result)
        })

        app.get('/participant', async(req, res)=>{
          const result = await addParticipantCollection.find().toArray()
          res.send(result);
      })

          app.get('/participant/:id', async(req, res)=>{
          const id = req.params.id;
          const query= {_id : new ObjectId(id)}
          const result = await addParticipantCollection.findOne(query)
          res.send(result)
        })


      // Get An User Data
      app.get("/participant/:email", async (req, res) => {
        const email = req.params.email;
        const query = { email: email };
        const user = await addParticipantCollection.findOne(query);
        res.send(user);
      });


    // payment intent
    app.post('/create-payment-intent', async(req, res)=>{
      const {price} = req.body;
      const amount = parseInt(price * 100);

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types:['card']
      })

      res.send({
        clientSecret: paymentIntent.client_secret
      })

    })

    app.post('/payments', async(req, res)=>{
      const payment = req.body;
      const result = await addPaymentCollection.insertOne(payment)

      console.log('payment info', payment)
      res.send(result)
    })

    app.get('/payments', async(req, res)=>{
      const result = await addPaymentCollection.find().toArray()
      res.send(result);
  })
  
    app.get('/payments/:email', verifyToken, async(req,res)=>{
      const query = {email:req.params.email}
      if(req.params.email !== req.decoded.email){
        return res.status(403).send({message: 'forbidden access'})
      }
      const result = await addPaymentCollection.find(query).toArray()
      res.send(result)
    })


    //   await client.db("admin").command({ ping: 1 });
      console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
      // Ensures that the client will close when you finish/error
    //   await client.close();
    }
  }
  run().catch(console.dir);



app.get('/', (req, res)=>{
    res.send('CampAid is running')
})

app.listen(port, ()=>{
    console.log(`CampAid  is on port: ${port}`)
})
  