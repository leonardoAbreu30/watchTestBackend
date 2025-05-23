import { Kafka, Producer, Consumer } from 'kafkajs';
import { kafkaService, TOPICS } from '../../services/kafka.service';

jest.mock('kafkajs', () => {
  const mockProducerConnect = jest.fn();
  const mockProducerDisconnect = jest.fn();
  const mockProducerSend = jest.fn();
  const mockConsumerConnect = jest.fn();
  const mockConsumerDisconnect = jest.fn();
  const mockConsumerSubscribe = jest.fn();
  const mockConsumerRun = jest.fn();

  return {
    Kafka: jest.fn().mockImplementation(() => ({
      producer: () => ({
        connect: mockProducerConnect,
        disconnect: mockProducerDisconnect,
        send: mockProducerSend
      }),
      consumer: () => ({
        connect: mockConsumerConnect,
        disconnect: mockConsumerDisconnect,
        subscribe: mockConsumerSubscribe,
        run: mockConsumerRun
      })
    })),
    mockProducerConnect,
    mockProducerDisconnect,
    mockProducerSend,
    mockConsumerConnect,
    mockConsumerDisconnect,
    mockConsumerSubscribe,
    mockConsumerRun
  };
});

describe('KafkaService', () => {
  const mockKafka = jest.mocked(Kafka);
  const {
    mockProducerConnect,
    mockProducerDisconnect,
    mockProducerSend,
    mockConsumerConnect,
    mockConsumerDisconnect,
    mockConsumerSubscribe,
    mockConsumerRun
  } = jest.requireMock('kafkajs');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('connect', () => {
    it('should connect to Kafka and subscribe to topics', async () => {
      mockProducerConnect.mockResolvedValueOnce(undefined);
      mockConsumerConnect.mockResolvedValueOnce(undefined);
      mockConsumerSubscribe.mockResolvedValueOnce(undefined);
      mockConsumerRun.mockResolvedValueOnce(undefined);

      await kafkaService.connect();

      expect(mockProducerConnect).toHaveBeenCalled();
      expect(mockConsumerConnect).toHaveBeenCalled();
      expect(mockConsumerSubscribe).toHaveBeenCalledWith({
        topics: Object.values(TOPICS)
      });
      expect(mockConsumerRun).toHaveBeenCalled();
    });

    it('should handle connection errors', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const error = new Error('Connection failed');
      mockProducerConnect.mockRejectedValueOnce(error);

      await kafkaService.connect();

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error connecting to Kafka:', error);
      consoleErrorSpy.mockRestore();
    });
  });

  describe('disconnect', () => {
    it('should disconnect producer and consumer', async () => {
      mockProducerDisconnect.mockResolvedValueOnce(undefined);
      mockConsumerDisconnect.mockResolvedValueOnce(undefined);

      await kafkaService.disconnect();

      expect(mockProducerDisconnect).toHaveBeenCalled();
      expect(mockConsumerDisconnect).toHaveBeenCalled();
    });
  });

  describe('publishTodoCreated', () => {
    it('should publish todo created event', async () => {
      const mockTodo = { id: 1, title: 'Test Todo' };
      const mockUserId = 123;
      const expectedMessage = {
        topic: TOPICS.TODO_CREATED,
        messages: [
          {
            key: '1',
            value: expect.any(String)
          }
        ]
      };

      mockProducerSend.mockResolvedValueOnce(undefined);

      await kafkaService.publishTodoCreated(mockTodo, mockUserId);

      expect(mockProducerSend).toHaveBeenCalledWith(expectedMessage);
      const sentMessage = JSON.parse(mockProducerSend.mock.calls[0][0].messages[0].value);
      expect(sentMessage).toEqual({
        todo: mockTodo,
        userId: mockUserId,
        timestamp: expect.any(String)
      });
    });

    it('should handle publish errors', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const error = new Error('Publish failed');
      mockProducerSend.mockRejectedValueOnce(error);

      await kafkaService.publishTodoCreated({ id: 1 }, 123);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error publishing todo.created event:', error);
      consoleErrorSpy.mockRestore();
    });
  });

  describe('publishTodoDeleted', () => {
    it('should publish todo deleted event', async () => {
      const mockTodoId = 1;
      const mockUserId = 123;
      const expectedMessage = {
        topic: TOPICS.TODO_DELETED,
        messages: [
          {
            key: '1',
            value: expect.any(String)
          }
        ]
      };

      mockProducerSend.mockResolvedValueOnce(undefined);

      await kafkaService.publishTodoDeleted(mockTodoId, mockUserId);

      expect(mockProducerSend).toHaveBeenCalledWith(expectedMessage);
      const sentMessage = JSON.parse(mockProducerSend.mock.calls[0][0].messages[0].value);
      expect(sentMessage).toEqual({
        todoId: mockTodoId,
        userId: mockUserId,
        timestamp: expect.any(String)
      });
    });

    it('should handle publish errors', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const error = new Error('Publish failed');
      mockProducerSend.mockRejectedValueOnce(error);

      await kafkaService.publishTodoDeleted(1, 123);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error publishing todo.deleted event:', error);
      consoleErrorSpy.mockRestore();
    });
  });
}); 