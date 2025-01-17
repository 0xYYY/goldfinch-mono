import chai from "chai"
import chaiSubset from "chai-subset"
chai.use(chaiSubset)
const expect = chai.expect

import {Response} from "firebase-functions"
import * as admin from "firebase-admin"
import firestore = admin.firestore

/**
 * Assert a response object of a cloud function matches the expected http status code and reponse body.
 * https://firebase.google.com/docs/functions/unit-testing#testing_http_functions
 * @param {number} expectedCode expected HTTP response status
 * @param {number} expectedBody expected response body
 * @return {any}
 */
const expectResponse = function (expectedCode: number, expectedBody: Record<string, unknown>): Response {
  return {
    status: (actualCode: number) => {
      expect(actualCode).to.eq(expectedCode)
      return {
        send: async (actualBody: Record<string, unknown>) => {
          expect(Object.keys(expectedBody).length).to.be.gt(0)
          return expect(actualBody).to.containSubset(expectedBody)
        },
      }
    },
  } as unknown as Response
}

/**
 * Assert a firestore collection is of the expected size
 * @param {firestore.CollectionReference<firestore.DocumentData>} collection  the firestore collection to check
 * @param {number} size the expected size (number of documents) in the collection
 */
const expectSize = async (collection: firestore.CollectionReference<firestore.DocumentData>, size: number) => {
  expect((await collection.get()).size).to.equal(size)
}

export {expectResponse, expectSize}
