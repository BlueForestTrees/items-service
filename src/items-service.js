import {map, omit, forEach, find, cloneDeep, filter, isNil, each} from "lodash"
import Fraction from "fraction.js"
import regexEscape from "regex-escape"

const debug = require('debug')('api:items')

export const multiplyBqt = (tree, coef) => {

    tree.items = map(tree.items,
        item => isNil(item.bqt) ?
            omit(item, "bqt")
            :
            ({...item, bqt: Fraction(item.bqt).mul(coef).valueOf()})
    )

    return tree
}

const configure = col => {
    //PRIVATE
    const setBqt = ({_id, quantity}) => col().update(({_id}), ({$set: {quantity}}), {upsert: true})
    const readBqt = async _id => col().findOne(({_id}), {quantity: 1})
    const graphLookup = (collectionName, connectFrom, connectTo) => ({
        $graphLookup: {
            from: collectionName,
            startWith: `$${connectFrom}`,
            connectFromField: connectTo,
            connectToField: connectFrom,
            maxDepth: 10,
            as: "cache"
        }
    })
    const adaptBqt = async (left, right) => (await getSertBqt(left)).bqt / left.bqt * right.bqt
    const getSertBqt = async trunk => {
        let dbTrunk = await readBqt(trunk._id)
        if (!dbTrunk || !dbTrunk.quantity) {
            await setBqt(trunk)
            dbTrunk = trunk
        }
        return dbTrunk
    }
    const searchTypes = {
        regex: v => ({$regex: `^.*${regexEscape(v)}.*`}),
        gt: v => ({$gt: v}),
        ne: v => ({$ne: v}),
        [null]: v => v
    }
    const prepareSearch = filters => {
        const search = {}
        for (let i = 0; i < filters.length; i++) {
            const filter = filters[i]
            if (filter.value !== undefined) {
                let searchType = searchTypes[filter.type]
                search[filter.key] = searchType && searchType(filter.value) || filter.value
            }
        }
        debug("search %o", search)
        return search
    }

    //LECTURE
    const search = (filters, limit, mixin) => col()
        .find(prepareSearch(filters), mixin)
        .sort({_id: 1})
        .limit(limit)
        .toArray()
    const findMixin = mixin => filters => col().find(filters, mixin).toArray()
    const findNoMixin = findMixin({})
    const findOne = (filters, mixin) => col().findOne(filters, mixin)
    const get = async ({_id}) => (await findOne(({_id}))) || undefined
    const append = (field, mixin, assign) => async items => {
        const infos = await findMixin(mixin)({_id: {$in: map(items, field)}})
        const results = []
        for (let i = 0; i < items.length; i++) {
            let item = items[i]
            for (let j = 0; j < infos.length; j++) {
                let info = infos[j]
                if (item[field]) {
                    if (item[field].equals(info._id)) {
                        results.push(assign(item, info))
                        break
                    }
                } else {
                    debug("append: Le document %o devrait porter le champ %o", col, item._id, field)
                    break
                }
            }
        }
        return results
    }


    const loadFromCache = (trunk, cache) => {
        if (isNil(trunk.bqt)) return
        const roots = []
        const cacheRoots = filter(cache, {trunkId: trunk._id})
        if (cacheRoots && cacheRoots.length > 0) {
            for (let i = 0; i < cacheRoots.length; i++) {
                const cacheRoot = cacheRoots[i]
                const root = {_id: cacheRoot.rootId}
                if (cacheRoot.bqt) {
                    root.bqt = trunk.bqt * cacheRoot.bqt
                }
                loadFromCache(root, cache)
                roots.push(root)
            }
            trunk.items = roots
        }
    }
    const getGraph = (filter, lookup) => col().aggregate([{$match: filter}, lookup]).next()
    const treefy = (graph) => {
        if (!graph) return null
        const tree = {_id: graph.trunkId, bqt: 1}
        loadFromCache(tree, graph.cache)
        return tree
    }
    const treeRead = (collectionName, connectFrom, connectTo) => filter =>
        getGraph(filter, graphLookup(collectionName, connectFrom, connectTo))
            .then(treefy)
            .then(tree => tree || {_id: filter[connectFrom], bqt: 1, items: []})


    const readAllQuantified = async items =>
        findNoMixin({trunkId: {$in: map(items, i => i._id)}})
            .then(dbItems => each(dbItems,
                dbItem => dbItem.bqt *= find(items, {_id: dbItem.trunkId}).bqt
            ))

    //ECRITURE
    const filteredUpdate = ({filter, item}) => col().update(filter, ({$set: item}))
    const update = item => col().update({_id: item._id}, ({$set: item}))
    const insertOne = item => col().insertOne(item)
    const bulkWrite = (data, options) => col().bulkWrite(data, options || {ordered: false})

    //SUPPR
    const deleteOne = item => col().deleteOne(item)
    const deleteMany = filter => col().deleteMany(filter)

    return {
        //LECTURE
        get, append, treeRead, readAllQuantified, search, findOne, findMixin, findNoMixin,
        //ECRITURE
        bulkWrite, update, insertOne, filteredUpdate,
        //SUPPR
        deleteOne, deleteMany
    }
}

export default configure
