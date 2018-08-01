import chai from 'chai';
import configure from "../src";
import {object} from "mongo-queries-blueforest";
import _ from 'lodash';

chai.should();

describe('TU items service', function () {

    it('set quantity query', async function () {
        const db = () => {
            return {
                update: (select, update, options) => ({select, update, options})
            };
        };

        configure(db)
            .setQuantity({_id: object("5a6a03c03e77667641d2d2c2"), quantity: {qt: 15, unit: "kg"}})
            .should.deep.equal({
            select: {_id: object("5a6a03c03e77667641d2d2c2")},
            update: {
                $set: {quantity: {qt: 15, unit: "kg"}}
            },
            options: {upsert: true}
        });

    });

});