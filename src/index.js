import {pullItem, pullItems, pushItem, quantityField, upsert, withId, withIdBqtG, matchId} from "mongo-queries-blueforest";
import {GrandeurMismatchError} from "errors-blueforest"
import Fraction from "fraction.js"
import {map, omit, forEach, find, cloneDeep} from "lodash"

const configure = db => {

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


    const getGraph = (_id, lookup) => db().aggregate([matchId(_id), lookup]).next()

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


    const erreurSiUnitIncompatibles = (quantity, roots) => {
        if (quantity && quantity.g && roots && roots.quantity) {
            if (quantity.g !== roots.quantity.g) {
                throw new GrandeurMismatchError(quantity.g, roots.quantity.g)
            }
        }

        return roots
    }

    const applyQuantity = (quantity, target) => {
        let coef
        if (quantity && quantity.bqt && target.quantity && target.quantity.bqt) {
            coef = quantity.bqt / target.quantity.bqt
        }
        target.items = coef ?
            map(target.items, item => item.quantity ? (item.quantity.bqt = Fraction(item.quantity.bqt).mul(coef).valueOf()) && item : omit(item, "quantity"))
            :
            map(target.items, item => omit(item, "quantity"))


        target.quantity = quantity

        return target
    }

    const load = _id => db().findOne(withId(_id)).then(i => i || {_id, items: []})

    const loadQuantified = async ({bqt, g, _id}) => {
        return load(_id)
            .then(items => erreurSiUnitIncompatibles({bqt, g}, items))
            .then(items => applyQuantity({bqt, g}, items))
    }

    const deleteItems = (trunkId, itemsIds) => db().update(withId(trunkId), pullItems(itemsIds));
    const removeItem = (leftId, rightId) => db().update(withId(leftId), pullItem(rightId));

    const insertItem = (left, right) =>
        removeItem(left._id, right._id)
            .then(() => addItem(left._id, right));

    const addItem = async (id, item) =>
        db()
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

    const readBqt = async (id) => db().findOne(withId(id), quantityField)

    const setBqt = ({_id, quantity}) => db().update(withId(_id), ({$set: {quantity}}), upsert)

    return {
        insertItem, upsertItem, removeItem, deleteItems, loadQuantified, initReadTree
    }
};

export default configure;