const chai = require('chai');
const supertest = require('supertest');
const app = require("./index"); // Update the path accordingly

const expect = chai.expect;
const request = supertest(app);


describe('Sleep Tracker API Tests', function() {
    // Increase the timeout for all tests to 5000ms
this.timeout(5000);
  let sleepRecordId;

  // Test the creation of a sleep record
  it('should create a sleep record', async () => {
    const response = await request
      .post('/sleep')
      .send({ date: new Date(), duration: 480 }); // Assuming 8 hours of sleep

    expect(response.status).to.equal(200);
    expect(response.body).to.have.property('_id');
    sleepRecordId = response.body._id;
  });

  // Test getting all sleep records
  it('should get all sleep records', async () => {
    const response = await request.get('/sleeprecords');

    expect(response.status).to.equal(200);
    expect(response.body).to.be.an('array');
  });
  
  // Add more tests as needed

  after(() => {
    // Add cleanup tasks if necessary
  });
});
