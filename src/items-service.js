import {pullItem, pullItems, pushItem, quantityField, upsert, withId, matchId, withIdIn, withIdBqt} from "mongo-queries-blueforest"
import {map, omit, forEach, find, cloneDeep} from "lodash"
import Fraction from "fraction.js"

export const multiplyBqt = (tree, coef) => {
    if (coef) {
        tree.items = map(tree.items, item => item.quantity ?
            ({...item, quantity: {bqt: Fraction(item.quantity.bqt).mul(coef).valueOf()}})
            :
            omit(item, "quantity")
        )
    } else {
        tree.items = map(tree, item => omit(item, "quantity"))
    }
    return tree
}

const configure = col => {
    //PRIVATE
    const setBqt = ({_id, quantity}) => col().update(withId(_id), ({$set: {quantity}}), upsert)
    const readBqt = async id => col().findOne(withId(id), quantityField)
    const addItem = async (id, item) => col().update(withId(id), pushItem(item), upsert)
    const graphLookup = collectionName => ({
        $graphLookup: {
            from: collectionName,
            startWith: `$items._id`,
            connectFromField: "items._id",
            connectToField: "_id",
            maxDepth: 10,
            as: "cache"
        }
    })
    const getGraph = (_id, lookup) => col().aggregate([matchId(_id), lookup]).next()
    const treefy = (graph) => {
        if (!graph) return null

        const cache = graph.cache
        const tree = omit(graph, "cache")

        tree.items = loadFromCache(tree, cache)
        tree.quantity = {bqt: 1}

        return tree
    }
    const loadFromCache = (tree, cache) => {
        const items = []
        forEach(tree.items, item => {
            item.items = []
            let cachedItem = cloneDeep(find(cache, {_id: item._id}))
            if (cachedItem) {
                multiplyBqt(cachedItem, item.quantity && item.quantity.bqt)
                cachedItem.quantity = item.quantity
                cachedItem.items = loadFromCache(cachedItem, cache)
                items.push(cachedItem)
            } else {
                items.push(omit(item, "items"))
            }
        })
        return items
    }
    const adaptBqt = async (left, right) => (await getSertBqt(left)).quantity.bqt / left.quantity.bqt * right.quantity.bqt
    const getSertBqt = async trunk => {
        let dbTrunk = await readBqt(trunk._id)
        if (!dbTrunk || !dbTrunk.quantity) {
            await setBqt(trunk)
            dbTrunk = trunk
        }
        return dbTrunk
    };

    //LECTURE
    const withIdsIn = _ids => col().find(withIdIn(_ids)).toArray()
    const get = ({_id}) => col().findOne(withId(_id)).then(i => i || {_id, items: []})
    const appendItemsInfos = mixin => async item => {
        const items = item.items
        const infos = await col().find(withIdIn(map(items, "_id")), mixin).toArray()

        for (let i = 0; i < items.length; i++) {
            let item = items[i]
            for (let j = 0; j < infos.length; j++) {
                let info = infos[j]
                if (item._id.equals(info._id)) {
                    Object.assign(item, info)
                }
            }
        }
        return item
    }
    const initReadTree = collectionName => ({_id}) =>
        getGraph(_id, graphLookup(collectionName))
            .then(treefy)
            .then(tree => tree || {...withIdBqt(_id, 1), items: []})
    const readAllQuantified = async items => Promise.all(map(items,
        item => item.quantity ?
            get(item).then(i => multiplyBqt(i, item.quantity && item.quantity.bqt))
            :
            withId(item._id)
    ))

    //ECRITURE
    const update = item => col().update(withId(item._id), ({$set: item}))
    const upsertItem = async (left, right) => removeItem(left._id, right._id).then(() => adaptBqt(left, right)).then(bqt => addItem(left._id, {...right, quantity: {bqt}}))
    const insertItem = (left, right) => removeItem(left._id, right._id).then(() => addItem(left._id, right))
    const insertOne = item => col().insertOne(item)

    //SUPPR
    const deleteOne = item => col().deleteOne(item)
    const removeItem = (leftId, rightId) => col().update(withId(leftId), pullItem(rightId))
    const deleteItems = (trunkId, itemsIds) => col().update(withId(trunkId), pullItems(itemsIds))

    return {
        //ECRITURE
        withIdsIn, get, appendItemsInfos, initReadTree, readAllQuantified,
        //ECRITURE
        update, upsertItem, insertItem, insertOne,
        //SUPPR
        deleteOne, removeItem, deleteItems,

    }
};

export default configure;
