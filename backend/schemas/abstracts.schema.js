module.exports = mongoose => {
    const abstractsSchema = mongoose.Schema({
        "title": String,
        "journal": String,
        "pubdate": String,
        "authors": [JSON],
        "pubmed_id": String,
        "text": String,
        "sentences": [String],
        "acronyms": [JSON],
        "acronymMentions": String
    },
    {
        collection: 'abstracts'
    });
    
    return abstractsSchema;
}