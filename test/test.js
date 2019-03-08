import chai, {expect} from 'chai'
import configure from "../src"

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


});