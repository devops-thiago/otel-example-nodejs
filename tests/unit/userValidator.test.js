/**
 * Unit Tests for User Validator
 * Tests validation schemas without HTTP
 */

const { userSchemas, validate } = require('../../src/validators/userValidator');

describe('User Validator Unit Tests', () => {
  describe('userSchemas.create', () => {
    it('should validate valid user data', () => {
      const validData = {
        name: 'John Doe',
        email: 'john@example.com',
        bio: 'Software Engineer',
      };

      const { error, value } = userSchemas.create.validate(validData);

      expect(error).toBeUndefined();
      expect(value).toEqual(validData);
    });

    it('should reject missing name', () => {
      const invalidData = {
        email: 'john@example.com',
        bio: 'Engineer',
      };

      const { error } = userSchemas.create.validate(invalidData);

      expect(error).toBeDefined();
      expect(error.details[0].path).toContain('name');
    });

    it('should reject missing email', () => {
      const invalidData = {
        name: 'John Doe',
        bio: 'Engineer',
      };

      const { error } = userSchemas.create.validate(invalidData);

      expect(error).toBeDefined();
      expect(error.details[0].path).toContain('email');
    });

    it('should reject invalid email format', () => {
      const invalidData = {
        name: 'John Doe',
        email: 'not-an-email',
        bio: 'Engineer',
      };

      const { error } = userSchemas.create.validate(invalidData);

      expect(error).toBeDefined();
      expect(error.details[0].path).toContain('email');
    });

    it('should reject name that is too short', () => {
      const invalidData = {
        name: 'J',
        email: 'john@example.com',
        bio: 'Engineer',
      };

      const { error } = userSchemas.create.validate(invalidData);

      expect(error).toBeDefined();
      expect(error.details[0].path).toContain('name');
    });

    it('should reject bio that is too long', () => {
      const invalidData = {
        name: 'John Doe',
        email: 'john@example.com',
        bio: 'a'.repeat(501),
      };

      const { error } = userSchemas.create.validate(invalidData);

      expect(error).toBeDefined();
      expect(error.details[0].path).toContain('bio');
    });

    it('should accept valid bio', () => {
      const validData = {
        name: 'John Doe',
        email: 'john@example.com',
        bio: 'a'.repeat(500),
      };

      const { error } = userSchemas.create.validate(validData);

      expect(error).toBeUndefined();
    });

    it('should accept user without bio', () => {
      const validData = {
        name: 'John Doe',
        email: 'john@example.com',
      };

      const { error, value } = userSchemas.create.validate(validData);

      expect(error).toBeUndefined();
      expect(value.bio).toBeUndefined();
    });

    it('should strip unknown fields', () => {
      const dataWithExtra = {
        name: 'John Doe',
        email: 'john@example.com',
        bio: 'Engineer',
        extraField: 'should be removed',
      };

      const { value } = userSchemas.create.validate(dataWithExtra, {
        stripUnknown: true,
      });

      expect(value.extraField).toBeUndefined();
    });
  });

  describe('userSchemas.update', () => {
    it('should validate valid update data', () => {
      const validData = {
        name: 'John Updated',
        bio: 'Updated Bio',
      };

      const { error, value } = userSchemas.update.validate(validData);

      expect(error).toBeUndefined();
      expect(value).toEqual(validData);
    });

    it('should accept partial updates', () => {
      const validData = {
        name: 'John Updated',
      };

      const { error, value } = userSchemas.update.validate(validData);

      expect(error).toBeUndefined();
      expect(value).toEqual(validData);
    });

    it('should reject empty update', () => {
      const invalidData = {};

      const { error } = userSchemas.update.validate(invalidData);

      expect(error).toBeDefined();
    });

    it('should validate email if provided', () => {
      const invalidData = {
        email: 'not-an-email',
      };

      const { error } = userSchemas.update.validate(invalidData);

      expect(error).toBeDefined();
      expect(error.details[0].path).toContain('email');
    });
  });

  describe('userSchemas.pagination', () => {
    it('should validate pagination parameters', () => {
      const validData = {
        limit: 20,
        offset: 10,
      };

      const { error, value } = userSchemas.pagination.validate(validData);

      expect(error).toBeUndefined();
      expect(value).toEqual(validData);
    });

    it('should apply default values', () => {
      const { value } = userSchemas.pagination.validate({});

      expect(value.limit).toBe(10);
      expect(value.offset).toBe(0);
    });

    it('should reject limit over 100', () => {
      const invalidData = {
        limit: 150,
      };

      const { error } = userSchemas.pagination.validate(invalidData);

      expect(error).toBeDefined();
    });

    it('should reject negative offset', () => {
      const invalidData = {
        offset: -5,
      };

      const { error } = userSchemas.pagination.validate(invalidData);

      expect(error).toBeDefined();
    });
  });

  describe('userSchemas.id', () => {
    it('should validate valid ID', () => {
      const validData = { id: 5 };

      const { error, value } = userSchemas.id.validate(validData);

      expect(error).toBeUndefined();
      expect(value).toEqual(validData);
    });

    it('should reject non-positive ID', () => {
      const invalidData = { id: 0 };

      const { error } = userSchemas.id.validate(invalidData);

      expect(error).toBeDefined();
    });

    it('should reject string ID', () => {
      const invalidData = { id: 'abc' };

      const { error } = userSchemas.id.validate(invalidData);

      expect(error).toBeDefined();
    });
  });

  describe('validate middleware', () => {
    it('should call next on valid data', () => {
      const req = {
        body: {
          name: 'John Doe',
          email: 'john@example.com',
        },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      const middleware = validate(userSchemas.create, 'body');
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should return 400 on invalid data', () => {
      const req = {
        body: {
          email: 'not-an-email',
        },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      const middleware = validate(userSchemas.create, 'body');
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'Validation failed',
            statusCode: 400,
          }),
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should validate query parameters', () => {
      const req = {
        query: {
          limit: 50,
          offset: 10,
        },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      const middleware = validate(userSchemas.pagination, 'query');
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.query.limit).toBe(50);
    });
  });
});
