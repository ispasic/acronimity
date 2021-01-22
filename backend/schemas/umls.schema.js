module.exports = mongoose => {
    const umlsSchema = mongoose.Schema({
        "tgt": String,
        "createdAt": Date
    },
    {
        collection: 'umls'
    });
    
    return umlsSchema;
}