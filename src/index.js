import {pullItem, pullItems, pushItem, quantityField, upsert, withId} from "mongo-queries-blueforest";
import {GrandeurMismatchError, UnitInvalidError} from "errors-blueforest";

const configure = db => {

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
            .then(() => adaptQtUnit(left, right))
            .then((q) => {
                console.log("ADAPTED Q", q)
                return q
            })
            .then(quantity => addItem(left._id, {...right, quantity}));


    const adaptQtUnit = async (left, right) => {

        console.log("ADAPT QT UNIT", left, right)

        let dbTrunkQt = await getSertQuantity(left);
        let coef = dbTrunkQt.quantity.baseQt / left.quantity.baseQt
        return {baseQt: coef * right.quantity.baseQt, qt: coef * right.quantity.qt, unit: right.quantity.unit}
    };

    const getSertQuantity = async trunk => {
        let res

        const dbTrunk = await readForQuantity(trunk._id)

        if (dbTrunk) {
            console.log("GET SERT FROM DB", dbTrunk)
            res = dbTrunk
        } else {
            let idQuantity = {_id: trunk._id, quantity: trunk.quantity}
            console.log("GET SERT INSERT", idQuantity)
            await setQuantity(idQuantity)
            res = trunk.quantity
        }
        console.log("GET SERT QUANTITY RES", res)
        return res
    };

    const readForQuantity = async (id) => db().findOne(withId(id), quantityField);

    const setQuantity = ({_id, quantity}) => db().update(withId(_id), ({$set: {quantity}}), upsert);

    return {
        insertItem, upsertItem, removeItem, deleteItems
    }
};

export default configure;