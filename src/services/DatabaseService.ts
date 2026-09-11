
/**
 * @fileoverview This service provides a strongly-typed, Singleton wrapper around the Firebase Admin Firestore SDK.
 * It is intended for use ONLY in trusted backend environments (e.g., Cloud Functions).
 * It enables privileged operations like atomic transactions and direct data manipulation.
 */

import * as admin from 'firebase-admin';
import { HttpsError } from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';

// Initialize the app if it hasn't been already.
if (admin.apps.length === 0) {
  admin.initializeApp();
}

/**
 * A Singleton service class to interact with Firestore using the Admin SDK.
 * This provides privileged access and should only be used in secure backend environments.
 */
export class DatabaseService {
  private static instance: DatabaseService;
  public readonly db: admin.firestore.Firestore;

  private constructor() {
    this.db = admin.firestore();
    this.db.settings({ ignoreUndefinedProperties: true });
    logger.info('DatabaseService Singleton Initialized (Admin SDK)');
  }

  /**
   * Gets the single instance of the DatabaseService.
   * @returns {DatabaseService} The singleton instance.
   */
  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  /**
   * Adds a document to a specified collection.
   * @template T The type of the data to add.
   * @param {string} collectionPath The path to the collection.
   * @param {T} data The data to add.
   * @returns {Promise<admin.firestore.DocumentReference<T>>} A promise that resolves with the new document reference.
   */
  public async addDocument<T extends admin.firestore.DocumentData>(
    collectionPath: string,
    data: T
  ): Promise<admin.firestore.DocumentReference<T>> {
    const collectionRef = this.db.collection(collectionPath) as admin.firestore.CollectionReference<T>;
    return collectionRef.add(data);
  }

  /**
   * Retrieves a document from a specified path.
   * @template T The expected type of the document data.
   * @param {string} docPath The path to the document.
   * @returns {Promise<T | null>} A promise that resolves with the document data, or null if it doesn't exist.
   */
  public async getDocument<T>(docPath: string): Promise<T | null> {
    const docRef = this.db.doc(docPath);
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      return null;
    }
    return docSnap.data() as T;
  }

  /**
   * Performs a secure, atomic transfer of funds between two user documents.
   * This operation is ACID-compliant. It will either complete entirely or fail entirely,
   * preventing any intermediate or inconsistent states.
   * @param {string} fromUserId The UID of the user sending funds.
   * @param {string} toUserId The UID of the user receiving funds.
   * @param {number} amount The amount to transfer (must be a positive integer).
   * @throws {HttpsError} Throws an error if funds are insufficient, users are not found, or the transaction fails.
   */
  public async transferFunds(fromUserId: string, toUserId: string, amount: number): Promise<{ transactionId: string }> {
    if (amount <= 0) {
      throw new HttpsError('invalid-argument', 'Transfer amount must be positive.');
    }
    if (fromUserId === toUserId) {
        throw new HttpsError('invalid-argument', 'Cannot transfer funds to the same account.');
    }

    const fromUserRef = this.db.collection('users').doc(fromUserId);
    const toUserRef = this.db.collection('users').doc(toUserId);
    const transactionRef = this.db.collection('transactions').doc(); // Create a new unique ID

    try {
      await this.db.runTransaction(async (transaction) => {
        const fromDoc = await transaction.get(fromUserRef);
        const toDoc = await transaction.get(toUserRef);

        if (!fromDoc.exists) {
          throw new HttpsError('not-found', `Sender account ${fromUserId} not found.`);
        }
        if (!toDoc.exists) {
          throw new HttpsError('not-found', `Recipient account ${toUserId} not found.`);
        }

        const fromData = fromDoc.data();
        const currentBalance = fromData?.accountBalance ?? 0;

        if (currentBalance < amount) {
          throw new HttpsError('failed-precondition', 'Insufficient funds.');
        }

        const newFromBalance = currentBalance - amount;
        const newToBalance = (toDoc.data()?.accountBalance ?? 0) + amount;
        
        // 1. Debit the sender
        transaction.update(fromUserRef, { accountBalance: newFromBalance });
        
        // 2. Credit the recipient
        transaction.update(toUserRef, { accountBalance: newToBalance });

        // 3. Create an immutable transaction log
        transaction.set(transactionRef, {
            id: transactionRef.id,
            from: fromUserId,
            to: toUserId,
            amount: amount,
            status: 'completed',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      });
      
      logger.info(`Successfully transferred ${amount} from ${fromUserId} to ${toUserId}. Transaction ID: ${transactionRef.id}`);
      return { transactionId: transactionRef.id };
    } catch (error) {
      logger.error('Fund transfer transaction failed:', error);
      if (error instanceof HttpsError) {
          throw error;
      }
      throw new HttpsError('internal', 'The fund transfer failed and was safely rolled back.');
    }
  }
}
