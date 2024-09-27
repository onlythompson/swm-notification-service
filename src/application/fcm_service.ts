import * as admin from 'firebase-admin';
import { Notification } from '../domain/notification';
import { logger } from '../cross_cutting/logging';
import { inject, injectable } from 'tsyringe';


@injectable()
export class FCMService {
  constructor(@inject("FirebaseApp") private firebaseApp: admin.app.App) {}

  async sendNotificationToToken(notification: Notification, token: string): Promise<string> {
    try {
      const message: admin.messaging.Message = {
        notification: {
          title: notification.type,
          body: notification.content,
        },
        data: notification.data,
        token: token,
      };

      const response = await this.firebaseApp.messaging().send(message);
      logger.info(`Successfully sent message: ${response}`);
      
      // Store the notification in Firestore
      await this.firebaseApp.firestore().collection('notifications').add({
        ...notification,
        token,
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
        status: 'sent'
      });

      return response;
    } catch (error) {
      logger.error('Error sending message:', error);
      throw error;
    }
  }

  async sendNotificationToTopic(notification: Notification, topic: string): Promise<string> {
    try {
      const message: admin.messaging.Message = {
        notification: {
          title: notification.type,
          body: notification.content,
        },
        data: notification.data,
        topic: topic,
      };

      const response = await this.firebaseApp.messaging().send(message);
      logger.info(`Successfully sent message to topic: ${response}`);

      // Store the notification in Firestore
      await this.firebaseApp.firestore().collection('notifications').add({
        ...notification,
        topic,
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
        status: 'sent'
      });

      return response;
    } catch (error) {
      logger.error('Error sending message to topic:', error);
      throw error;
    }
  }

  async subscribeToTopic(tokens: string[], topic: string): Promise<void> {
    try {
      const response = await this.firebaseApp.messaging().subscribeToTopic(tokens, topic);
      logger.info(`Successfully subscribed to topic: ${response.successCount} devices`);

      // Update topic subscriber count in Firestore
      await this.firebaseApp.firestore().collection('topics').doc(topic).update({
        subscriberCount: admin.firestore.FieldValue.increment(response.successCount)
      });
    } catch (error) {
      logger.error('Error subscribing to topic:', error);
      throw error;
    }
  }

  async unsubscribeFromTopic(tokens: string[], topic: string): Promise<void> {
    try {
      const response = await this.firebaseApp.messaging().unsubscribeFromTopic(tokens, topic);
      logger.info(`Successfully unsubscribed from topic: ${response.successCount} devices`);

      // Update topic subscriber count in Firestore
      await this.firebaseApp.firestore().collection('topics').doc(topic).update({
        subscriberCount: admin.firestore.FieldValue.increment(-response.successCount)
      });
    } catch (error) {
      logger.error('Error unsubscribing from topic:', error);
      throw error;
    }
  }
}