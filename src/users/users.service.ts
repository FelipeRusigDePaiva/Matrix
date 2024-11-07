import { Injectable } from '@nestjs/common';
import { DynamoDBClient, GetItemCommand, UpdateItemCommand, ReturnValue } from '@aws-sdk/client-dynamodb';

@Injectable()
export class UsersService {
  private readonly dynamoDbClient = new DynamoDBClient({ region: 'us-east-1' });

  async getUser(userId: string) {
    const params = {
      TableName: 'Users',
      Key: {
        userId: { S: userId },
      },
    };

    const { Item } = await this.dynamoDbClient.send(new GetItemCommand(params));
    return Item ? { 
      userId: Item.userId.S, 
      userType: Item.userType.S,
      decksCreated: Number(Item.decksCreated.N), 
      decksPublished: Number(Item.decksPublished.N) 
    } : null;
  }

  async updateUser(userId: string, decksCreated: number, decksPublished: number) {
    const params = {
      TableName: 'Users',
      Key: {
        userId: { S: userId },
      },
      UpdateExpression: 'SET decksCreated = :decksCreated, decksPublished = :decksPublished',
      ExpressionAttributeValues: {
        ':decksCreated': { N: decksCreated.toString() },
        ':decksPublished': { N: decksPublished.toString() },
      },
      ReturnValues: ReturnValue.ALL_NEW,
    };

    const result = await this.dynamoDbClient.send(new UpdateItemCommand(params));
    return result.Attributes;
  }

  async canCreateDeck(userId: string): Promise<boolean> {
    const user = await this.getUser(userId);
    if (!user) return false;

    const maxDecks = user.userType === 'free' ? 10 : 50;
    return user.decksCreated < maxDecks;
  }

  async canPublishDeck(userId: string): Promise<boolean> {
    const user = await this.getUser(userId);
    if (!user) return false;

    const maxPublished = user.userType === 'free' ? 1 : 5;
    return user.decksPublished < maxPublished;
  }
}