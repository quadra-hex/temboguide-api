const cloudinary = require('cloudinary').v2
const multer     = require('multer')
const streamifier = require('streamifier')

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

// Upload buffer to cloudinary using stream
const uploadToCloudinary = (buffer, folder, resourceType = 'image') => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: `temboguide/${folder}`, resource_type: resourceType },
      (error, result) => {
        if (error) reject(error)
        else resolve(result)
      }
    )
    streamifier.createReadStream(buffer).pipe(uploadStream)
  })
}

// Multer uses memory storage — we upload to cloudinary manually in controllers
const memoryStorage = multer.memoryStorage()

const uploadImage   = multer({ storage: memoryStorage, limits: { fileSize: 10 * 1024 * 1024 } })
const uploadVideo   = multer({ storage: memoryStorage, limits: { fileSize: 100 * 1024 * 1024 } })
const uploadPayment = multer({ storage: memoryStorage, limits: { fileSize: 10 * 1024 * 1024 } })

module.exports = { cloudinary, uploadImage, uploadVideo, uploadPayment, uploadToCloudinary }
