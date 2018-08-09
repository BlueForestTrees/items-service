import {pullItem, pullItems, pushItem, quantityField, upsert, withId, withIdBqtG, matchId, withIdIn} from "mongo-queries-blueforest";
import {map, omit, forEach, find, cloneDeep} from "lodash"

const configure = col => {

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

   const initReadTree = collectionName => ({bqt, g, _id}) =>
        getGraph(_id, graphLookup(collectionName))
            .then(graph => graph && treefy({bqt, g}, graph))
            .then(tree => tree || {...withIdBqtG(_id, bqt, g), items: []})


    const getGraph = (_id, lookup) => col().aggregate([matchId(_id), lookup]).next()

    const treefy = (quantity, graph) => {

        const cache = graph.cache
        const tree = omit(graph, "cache")

        applyQuantity(quantity, tree)

        tree.items = loadFromCache(tree, cache)

        return tree
    }

    const loadFromCache = (tree, cache) => {
        const items = []
        forEach(tree.items, item => {
            item.items = []
            let foundInCache = find(cache, {_id: item._id})
            if (foundInCache) {
                const cachedItem = cloneDeep(foundInCache)
                applyQuantity(item.quantity, cachedItem)
                cachedItem.items = loadFromCache(cachedItem, cache)
                items.push(cachedItem)
            } else {
                items.push(omit(item, "items"))
            }
        })
        return items
    }

    const load = _id => col().findOne(withId(_id)).then(i => i || {_id, items: []})

    const deleteItems = (trunkId, itemsIds) => col().update(withId(trunkId), pullItems(itemsIds));
    const removeItem = (leftId, rightId) => col().update(withId(leftId), pullItem(rightId));

    const insertItem = (left, right) =>
        removeItem(left._id, right._id)
            .then(() => addItem(left._id, right));

    const addItem = async (id, item) =>
        col()
            .update(withId(id), pushItem(item), upsert);

    const upsertItem = async (left, right) =>
        removeItem(left._id, right._id)
            .then(() => adaptBqt(left, right))
            .then(bqt => addItem(left._id, {...right, quantity: {bqt}}));


    const adaptBqt = async (left, right) => (await getSertBqt(left)).quantity.bqt / left.quantity.bqt * right.quantity.bqt

    const getSertBqt = async trunk => {
        console.log("GET SERT", trunk)
        let dbTrunk = await readBqt(trunk._id)
        console.log("GET SERT DB TRUNK", dbTrunk)
        if (!dbTrunk || !dbTrunk.quantity) {
            await setBqt(trunk)
            console.log("GET SERT INSERTED", trunk)
            dbTrunk = trunk
        }
        return dbTrunk
    };

    const readBqt = async (id) => col().findOne(withId(id), quantityField)

    const setBqt = ({_id, quantity}) => col().update(withId(_id), ({$set: {quantity}}), upsert)

    return {
        get,
        appendItemsInfos,
        insertItem, upsertItem, removeItem, deleteItems, initReadTree
    }
};

export default configure;