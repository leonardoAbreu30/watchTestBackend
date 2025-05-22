import { Kafka, Producer, Consumer } from 'kafkajs';
import 'dotenv/config';

// Kafka topics
export const TOPICS = {
    TODO_CREATED: 'todo.created',
    TODO_DELETED: 'todo.deleted'
};

class KafkaService {
    private kafka: Kafka;
    private producer: Producer;
    private consumer: Consumer;

    constructor() {
        this.kafka = new Kafka({
            clientId: 'todo-app',
            brokers: [(process.env.KAFKA_BROKER || 'localhost:9092')],
            retry: {
                initialRetryTime: 100,
                retries: 8
            }
        });

        this.producer = this.kafka.producer();
        this.consumer = this.kafka.consumer({ groupId: 'todo-group' });
    }

    async connect() {
        try {
            await this.producer.connect();
            await this.consumer.connect();
            console.log('Connected to Kafka');

            // Subscribe to topics
            await this.consumer.subscribe({ topics: Object.values(TOPICS) });

            // Start consuming messages
            await this.consumer.run({
                eachMessage: async ({ topic, partition, message }) => {
                    if (!message.value) return;

                    const eventData = JSON.parse(message.value.toString());
                    console.log(`Received message from topic ${topic}:`, eventData);

                    // Handle different events
                    switch (topic) {
                        case TOPICS.TODO_CREATED:
                            await this.handleTodoCreated(eventData);
                            break;
                        case TOPICS.TODO_DELETED:
                            await this.handleTodoDeleted(eventData);
                            break;
                    }
                }
            });
        } catch (error) {
            console.error('Error connecting to Kafka:', error);
        }
    }

    async disconnect() {
        await this.producer.disconnect();
        await this.consumer.disconnect();
    }

    async publishTodoCreated(todo: any, userId: number) {
        try {
            await this.producer.send({
                topic: TOPICS.TODO_CREATED,
                messages: [
                    {
                        key: todo.id.toString(),
                        value: JSON.stringify({
                            todo,
                            userId,
                            timestamp: new Date().toISOString()
                        })
                    }
                ]
            });
        } catch (error) {
            console.error('Error publishing todo.created event:', error);
        }
    }

    async publishTodoDeleted(todoId: number, userId: number) {
        try {
            await this.producer.send({
                topic: TOPICS.TODO_DELETED,
                messages: [
                    {
                        key: todoId.toString(),
                        value: JSON.stringify({
                            todoId,
                            userId,
                            timestamp: new Date().toISOString()
                        })
                    }
                ]
            });
        } catch (error) {
            console.error('Error publishing todo.deleted event:', error);
        }
    }

    private async handleTodoCreated(eventData: any) {
        // Handle todo created event
        // You can add additional logic here, such as:
        // - Sending notifications
        // - Updating analytics
        // - Triggering other services
        console.log('Todo created:', eventData);
    }

    private async handleTodoDeleted(eventData: any) {
        // Handle todo deleted event
        console.log('Todo deleted:', eventData);
    }
}

// Create a singleton instance
export const kafkaService = new KafkaService();

// Connect to Kafka when the service is imported
kafkaService.connect().catch(console.error); 