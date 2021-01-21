module.exports = mongoose => {
    const umlsSchema = mongoose.Schema({
        "tgt": String,
        "date": Date
    },
    {
        collection: 'umls'
    });
    
    return umlsSchema;
}