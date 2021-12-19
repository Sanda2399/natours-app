class Features
{
    constructor(query, queryString)
    {
        this.query = query;
        this.queryString = queryString;
    }

    filter()
    {
        // 1a. Filtering
        const queryObj = {...this.queryString};
        const excludedFields = ['page', 'sort', 'limit', 'fields'];

        // Loops through the queryObject and delete the fields corresponding 
        // to the matching fields in the excludedFields array.
        excludedFields.forEach(element => delete queryObj[element]);

        // 1b. Advanced Filtering (Allows for querying with less or greater than operators)
        let queryStr = JSON.stringify(queryObj);
        queryStr = queryStr
        .replace(
            /\b(gte?|lte?)\b/g, 
            match => `$${match}`
        );

        this.query = this.query.find(JSON.parse(queryStr));
        return this;
    }

    sort()
    {
        if (this.queryString.sort)
        {
            const sortBy = this.queryString.sort.split(',').join(' ')
            this.query = this.query.sort(sortBy);
        }
        else 
        {
            this.query = this.query.sort('_id');
        }

        return this;
    }

    fieldLimting()
    {
        // 3. Field Limiting
        if (this.queryString.fields)
        {
            const fields = this.queryString.fields.split(',').join(' ');
            this.query = this.query.select(fields);
        }
        else 
        {
            this.query = this.query.select('-__v');
        }

        return this;
    }

    pagination()
    {
        // 4. Pagination
        const page = parseInt(this.queryString.page) || 1;
        const limit = parseInt(this.queryString.limit) || 100;
        const skip = (page - 1) * limit;

        this.query = this.query.skip(skip).limit(limit);

        return this;
    }
}

module.exports = Features;