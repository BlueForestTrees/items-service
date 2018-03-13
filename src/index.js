import {qtUnitCoef} from "trees-common/dist";

const configure = db => {

    const upsertItem = async ({left, right}) =>
        removeRoot({trunkId: left._id, rootId: right._id})
            .then(() => adaptQtUnit(left, right))
            .then(quantity => addRoot(left._id, right._id, quantity));

    export const removeRoot = ({trunkId, rootId}) => db().update(withId(trunkId), pullItem(rootId));
    const addRoot = async (trunkId, rootId, quantity) => db().update(withId(trunkId), pushItem({_id: rootId, quantity}), upsert);

    const adaptQtUnit = async (trunk, root) => {
        let dbTrunkQt = await getSertQuantity(trunk);
        let trunkCoef = 0;

        try {
            trunkCoef = qtUnitCoef(dbTrunkQt, trunk.quantity);
        } catch (e) {
            if (e instanceof GrandeurMismatchError) {
                throw new UnitInvalidError(`unité incompatible`, e);
            }
        }

        return {qt: trunkCoef * root.quantity.qt, unit: root.quantity.unit};
    };

    const getSertQuantity = async trunk => {
        const trunkQuantity = await readForQuantity(trunk._id)
            .then(root => root && root.quantity || null);

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
         upsertItem
    }
};


export const init = configure;