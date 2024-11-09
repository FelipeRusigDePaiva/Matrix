import { BadRequestException, Injectable } from '@nestjs/common';
import { DynamoDBClient, GetItemCommand, UpdateItemCommand, ReturnValue, PutItemCommand, DeleteItemCommand } from '@aws-sdk/client-dynamodb';

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

  async deleteCreatedDeck(userId: string): Promise<any> {
    const user = await this.getUser(userId);
    if (!user || user.decksCreated <= 0) {
      throw new Error('Nenhum deck criado para apagar.');
    }
    
    const decksCreated = user.decksCreated - 1;
    return this.updateUser(userId, decksCreated, user.decksPublished);
  }

  async deletePublishedDeck(userId: string): Promise<any> {
    const user = await this.getUser(userId);
    if (!user || user.decksPublished <= 0) {
      throw new Error('Nenhum deck publicado para apagar.');
    }

    const decksPublished = user.decksPublished - 1;
    return this.updateUser(userId, user.decksCreated, decksPublished);
  }

  async addUser(userId: string, userType: string): Promise<any> {
    if (userType !== 'free' && userType !== 'super') {
      throw new BadRequestException('Tipo de usuário inválido. Deve ser "free" ou "super".');
    }

    const existingUser = await this.getUser(userId);
    if (existingUser) {
      throw new BadRequestException('Usuário já existe.');
    }

    const params = {
      TableName: 'Users',
      Item: {
        userId: { S: userId },
        userType: { S: userType },
        decksCreated: { N: "0" },
        decksPublished: { N: "0" },
      },
    };

    await this.dynamoDbClient.send(new PutItemCommand(params));
    return { message: 'Usuário criado com sucesso', userId, userType };
  }

  async deleteUser(userId: string): Promise<any> {
    const user = await this.getUser(userId);
    if (!user) {
      throw new BadRequestException('Usuário não encontrado.');
    }

    const params = {
      TableName: 'Users',
      Key: {
        userId: { S: userId },
      },
    };

    await this.dynamoDbClient.send(new DeleteItemCommand(params));
    return { message: 'Usuário deletado com sucesso', userId };
  }
}