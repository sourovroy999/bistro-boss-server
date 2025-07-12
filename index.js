const express=require('express')

const app=express()

const multer = require('multer');
const upload = multer();
const axios=require('axios')

const cors=require('cors')
const {  ObjectId } = require('mongodb')
const port=process.env.PORT || 5000

const jwt=require('jsonwebtoken')

require('dotenv').config()

const stripe=require('stripe')(process.env.STRIPE_SECRET_KEY)



 

//middleware
app.use(cors({
  origin:'http://localhost:5173',
  credentials:true
}))
app.use(express.json())

//



const { MongoClient, ServerApiVersion } = require('mongodb');
const { from } = require('form-data');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.iy6spfv.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    
    await client.connect();

    const userCollection=client.db("bistroDB").collection("users")
    const menuCollection=client.db("bistroDB").collection("menu")
    const reviewCollection=client.db("bistroDB").collection("reviews")
    const cartCollection=client.db("bistroDB").collection("carts")
    const paymentCollection=client.db("bistroDB").collection("payments")

    //jwt related api
    app.post('/jwt', async(req,res)=>{

      const user=req.body;
    const token= jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {expiresIn:'3d'});

    res.send({token});

    })

    //middleware
    const verifyToken=(req,res,next)=>{
      // console.log( 'inside verify token', req.headers);
      // console.log(req.headers.authorization);

      if(!req.headers.authorization){
        return res.status(401).send({message: 'unauthorized access'})
      }

      const token=req.headers.authorization.split(' ')[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err,decoded)=>{
        if(err){
          return res.status(401).send({message:'forbidden access'})
        }
        req.decoded=decoded;
        next()
      })
   }

   //use verify admin after verify token
   const verifyAdmin= async(req,res, next)=>{
    const email=req.decoded.email;
    const query={email: email};
    const user=await userCollection.findOne(query);

    const isAdmin=user?.role === 'admin';
    if(!isAdmin){
      return res.status(403).send({message:'forbidden access'});

    }
    next()
   }

  

    //users related api
 

    app.post('/users', async(req,res)=>{
      const user=req.body;
      //insert emaim if user does not exists.
      // you can do it many ways(1. email unique, 2.upsert, 3. simple checking)

      const query={email:user.email}
      const existingUser=await userCollection.findOne(query)
      if(existingUser){
        return res.send({message:'user already exists', insertedId: null})
      }

      const result=await userCollection.insertOne(user);
      res.send(result)
    })

    app.get('/users/admin/:email', verifyToken, async(req,res)=>{
      const email=req.params.email;
      if(email !== req.decoded.email ){
        return res.status(403).send({message: 'forbidden access'})
      }

      const query={email: email};
      const user=await userCollection.findOne(query);
      let admin= false;
      if(user){
        admin=user?.role === 'admin';

      }

      res.send({admin})
    })

    app.get('/users',verifyToken, verifyAdmin, async(req,res)=>{

      const result=await userCollection.find().toArray();
      res.send(result)
    })
    app.delete('/users/:id', verifyToken, verifyAdmin, async(req,res)=>{
      const id=req.params.id;
      const query={_id:new ObjectId(id)}
      const result=await userCollection.deleteOne(query);
      res.send(result);
    })

    app.patch('/users/admin/:id', verifyToken, verifyAdmin, async(req,res)=>{
      const id=req.params.id;
      const filter={_id: new ObjectId(id)}
      const updatedDoc={
        $set:{
          role:'admin'
        }
      }

      const result=await userCollection.updateOne(filter, updatedDoc);
      res.send(result)

    })

    //menu related apis

    app.get('/menu', async(req, res)=>{
        const result=await menuCollection.find().toArray();
        res.send(result)
    })

    app.get('/menu/:id', async(req, res)=>{
      const id=req.params.id;
      const query={_id: new ObjectId(id)}
      const result=await menuCollection.findOne(query);
      res.send(result)

    })

    app.patch('/menu/:id', async(req,res)=>{
      const item=req.body;
      const id=req.params.id;
      const filter={_id: new ObjectId(id)}
      const updatedDoc={
        $set:{
          name:item.name,
          category:item.category,
          price:item.price,
          recipe:item.recipe,
          image:item.image
        }
      }

      const result=await menuCollection.updateOne(filter, updatedDoc);

      res.send(result);
    })

    app.post('/menu',verifyToken, verifyAdmin, async(req,res)=>{
      const item=req.body;
      const result=await menuCollection.insertOne(item);
      res.send(result)
    })

    app.delete('/menu/:id',verifyToken, verifyAdmin, async(req,res)=>{
      const id=req.params.id;
      const query={_id: id}
      const result=await menuCollection.deleteOne(query);
      res.send(result)
    })

    app.get('/reviews', async(req, res)=>{
        const result=await reviewCollection.find().toArray();
        res.send(result)
    })

     //image upload api
   app.post('/upload-image', verifyToken, verifyAdmin, upload.single('image'), async(req,res)=>{
    try{
      const imageFile=req.file;
      const formData= new FormData();
      formData.append('image', imageFile.buffer.toString('base64'));
    const imgbbResponse = await axios.post(
      `https://api.imgbb.com/1/upload?key=${process.env.VITE_IMAGE_HOSTING_KEY}`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }
    );
    
    res.json(imgbbResponse.data);
    } catch(error){
          res.status(500).json({ error: 'Image upload failed' });

    }
   })

   




    // carts collection

    app.get('/carts', async(req,res)=>{
        const email=req.query.email;
        const query={ email:email }
        const result=await cartCollection.find(query).toArray();
        res.send(result)
    })

    app.post('/carts', async(req, res)=>{
        const cartItem=req.body;
        const result=await cartCollection.insertOne(cartItem)
        res.send(result)
    })

    app.delete('/carts/:id', async(req,res)=>{
      const id=req.params.id;
      const query= {_id: new ObjectId(id)}
      const result=await cartCollection.deleteOne(query)
      res.send(result)
    })


    //payment intent
    app.post('/create-payment-intent', async(req, res)=>{
      const{price}=req.body;
      const amount=parseInt(price*100);
      console.log(amount, 'is inside server')


      const paymentIntent=await stripe.paymentIntents.create({
        amount:amount,
        currency:'USD',
        payment_method_types:['card'],

      });

      res.send({
        clientSecret:paymentIntent.client_secret
      })

    })

    app.get('/payments/:email',verifyToken, async(req,res)=>{
      const query={email:req.params.email}
      if(req.params.email !== req.decoded.email){
        //
        return res.status(403).send({message:'forbidden access'})
      }
      const result=await paymentCollection.find(query).toArray();
      res.send(result);
    })

    app.post('/payments', async(req,res)=>{
      const payment=req.body;
      const paymentResult=await paymentCollection.insertOne(payment);

      //carefully delete each item from the cart
    console.log('payment info', payment);
    const query={_id:{
      $in:payment.cartIds.map(id=> new ObjectId(id))
    }}

    const deleteResult=await cartCollection.deleteMany(query)

    res.send({paymentResult, deleteResult})

    
    })

    //stats analytics
    app.get('/admin-stats', verifyToken, verifyAdmin, async(req,res)=>{
      const users=await userCollection.estimatedDocumentCount();
      const menuItems=await menuCollection.estimatedDocumentCount();
      const orders=await paymentCollection.estimatedDocumentCount();

      //this is not the best way
      // const payments=await paymentCollection.find().toArray();
      // const revenue=payments.reduce((total, payment)=>total+payment.price , 0);

      //good way to sum payments
      const result =await paymentCollection.aggregate([
        {
          $group:{
            _id:null,
            totalRevenue:{$sum:"$price"}
          }
        },

      ]).toArray();

      // const revenue=result?.total || 0;
      const revenue=result.length >0? result[0].totalRevenue : 0 ;




      res.send({
        users,
        menuItems,
        orders,
        revenue
      })
    })


    //order status
    /**
     * ---non-efficient way
     * 
     * 1.load all the payments
     * 2.for each menuItemsId(which is an array), go find the item from menu collection
     * 3. for each item in the menu collection that you found from a payment entry (document).
     * 
     * 
     * ------efficient way
     * -->
     * (use aggrete pipeline)
     * 
     */

    //using aggregate pipeline

    app.get('/order-stats',verifyToken, verifyAdmin, async(req,res)=>{
      const result=await paymentCollection.aggregate([

        //step 1: unwind menuItemIds
        {$unwind: '$menuItemIds'},
           // Step 2: Convert to ObjectId if stored as string
      {
        $addFields: {
          menuItemObjectId: { $toObjectId: '$menuItemIds' }
        }
      },

        //step 3: lookup menu items
        {
          $lookup:{
            from:'menu',
            localField:'menuItemObjectId',
            foreignField:'_id',
            as:'menuItems'
          }
        },


         // Step 4: Flatten the menuItems array
      { $unwind: '$menuItems' },

      //step:5 group by category
      {
        $group:{
          _id:'$menuItems.category',
          totalQuantity:{$sum:1},
          totalRevenue:{$sum:'$menuItems.price'}
        }
      },
      {
        $project:{
          _id:0,
          category:'$_id',
          totalQuantity:1,
          totalRevenue:1
        }
      }

      ]).toArray();
      res.send(result)
    })





    

    await client.db("admin").command({ ping: 1 })
    console.log("Pinged your deployment. You successfully connected to MongoDB!");

  } finally {
   
    // await client.close();
  }
}
run().catch(console.dir);




app.get('/', (req,res)=>{
    res.send('boss is running')
})

app.listen(port , ()=>{
    console.log(`bistro boss server is running on port ${port}`);
    
})