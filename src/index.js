import {qtUnitCoef} from "trees-units";
import {pullItem, pushItem, quantityField, upsert, withId} from "trees-query";
import {GrandeurMismatchError, UnitInvalidError} from "trees-errors";

const configure = db => {

    const insertItem = (left, right) =>
        removeItem(left._id, right._id)
            .then(() => addItem(left._id, right._id));

    const removeItem = (leftId, rightId) => db().update(withId(leftId), pullItem(rightId));
    const addItem = async (leftId, rightId, quantity) => db().update(withId(leftId), pushItem({_id: rightId, quantity}), upsert);

    const upsertItem = async (left, right) =>
        removeItem(left._id, right._id)
            .then(() => adaptQtUnit(left, right))
            .then(quantity => addItem(left._id, right._id, quantity));


    const adaptQtUnit = async (left, right) => {
        let dbTrunkQt = await getSertQuantity(left);
        let trunkCoef = 0;

        try {
            trunkCoef = qtUnitCoef(dbTrunkQt, left.quantity);
        } catch (e) {
            if (e instanceof GrandeurMismatchError) {
                throw new UnitInvalidError(`unité incompatible`, e);
            }
        }

        return {qt: trunkCoef * right.quantity.qt, unit: right.quantity.unit};
    };

    const getSertQuantity = async trunk => {
        const trunkQuantity =
            await readForQuantity(trunk._id)
                .then(item => item && item.quantity || null);

        if (trunkQuantity) {
            return trunkQuantity;
        } else if (trunk.quantity && trunk.quantity.qt && trunk.quantity.unit) {
            await setQuantity({_id: trunk._id, quantity: trunk.quantity});
            return trunk.quantity;
        } else {
            return {};
        }
    };

    const readForQuantity = async (id) => db().findOne(withId(id), quantityField);

    const setQuantity = ({_id, quantity}) => db().update(withId(_id), ({$set: {quantity}}), upsert);

    return {
        setQuantity, insertItem
    }
};

export default configure;