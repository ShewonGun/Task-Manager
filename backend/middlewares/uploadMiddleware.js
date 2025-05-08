import multer from 'multer'

// Configure multer storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/')
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`)
    },
})

// File filter to allow only images
const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif']
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true)
    } else {
        cb(new Error('Invalid file type. Only JPEG, PNG, and GIF are allowed.'), false)
    }
}

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
})

export default upload