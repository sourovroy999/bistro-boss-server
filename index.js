const express=require('express')

const app=express()

const cors=require('cors')
const { Long } = require('mongodb')
const port=process.env.PORT || 5000

//middleware
app.use(cors())
app.use(express.json())

app.get('/', (req,res)=>{
    res.send('boss is running')
})

app.listen(port , ()=>{
    console.log(`bistro boss server is running on port ${port}`);
    
})