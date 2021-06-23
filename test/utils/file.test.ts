import {expect} from "chai";
import {toCsv, fromCsv} from "../../src/utils";

describe("utils / file - csv", () => {
  it("Convert to and from CSV", () => {
    const data = [
      {a: 1, b: "x"},
      {a: 3, b: "y"},
    ];

    const csv = toCsv(data);
    expect(csv).to.equal(`a,b
1,x
3,y
`);

    const dataRev = fromCsv(csv);
    expect(dataRev).to.deep.equal(data);
  });

  it("Handle comma in value", () => {
    const data = [{id: "1,2,3"}];
    const csv = toCsv(data);
    expect(csv).to.equal(`id
"1,2,3"
`);
  });
});
