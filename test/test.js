import chai, {expect} from 'chai'
import configure, {multiplyBqt} from "../src"

chai.should();

describe('TU items service', function () {

    it('set quantity query', async function () {
        const db = () => {
            return {
                update: (select, update, options) => ({select, update, options})
            };
        };

        configure(db)

    });

    it('multiply bqt of items', function () {
        const item = {
            "_id": "444444444444444444444444",
            "items": [
                {
                    "_id": "5a6a03c03e77667641d2d2c9",
                    "bqt": 4
                }
            ]
        }
        const itemBy2 = {
            "_id": "444444444444444444444444",
            "items": [
                {
                    "_id": "5a6a03c03e77667641d2d2c9",
                    "bqt": 8
                }
            ]
        }
        expect(multiplyBqt(item, 2)).to.deep.equal(itemBy2)
    })


});