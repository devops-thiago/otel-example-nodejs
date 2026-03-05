/**
 * User Validation Schemas
 * Uses Joi for request validation
 */

const Joi = require('joi');

const userSchemas = {
  create: Joi.object({
    name: Joi.string().min(2).max(255).required().messages({
      'string.base': 'Name must be a string',
      'string.empty': 'Name is required',
      'string.min': 'Name must be at least 2 characters long',
      'string.max': 'Name must not exceed 255 characters',
      'any.required': 'Name is required',
    }),
    email: Joi.string().email().required().messages({
      'string.base': 'Email must be a string',
      'string.empty': 'Email is required',
      'string.email': 'Email must be a valid email address',
      'any.required': 'Email is required',
    }),
    bio: Joi.string().max(500).allow('').optional().messages({
      'string.base': 'Bio must be a string',
      'string.max': 'Bio must not exceed 500 characters',
    }),
  }),

  update: Joi.object({
    name: Joi.string().min(2).max(255).optional().messages({
      'string.base': 'Name must be a string',
      'string.min': 'Name must be at least 2 characters long',
      'string.max': 'Name must not exceed 255 characters',
    }),
    email: Joi.string().email().optional().messages({
      'string.base': 'Email must be a string',
      'string.email': 'Email must be a valid email address',
    }),
    bio: Joi.string().max(500).allow('').optional().messages({
      'string.base': 'Bio must be a string',
      'string.max': 'Bio must not exceed 500 characters',
    }),
  })
    .min(1)
    .messages({
      'object.min': 'At least one field must be provided for update',
    }),

  pagination: Joi.object({
    limit: Joi.number().integer().min(1).max(100).default(10).messages({
      'number.base': 'Limit must be a number',
      'number.integer': 'Limit must be an integer',
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit must not exceed 100',
    }),
    offset: Joi.number().integer().min(0).default(0).messages({
      'number.base': 'Offset must be a number',
      'number.integer': 'Offset must be an integer',
      'number.min': 'Offset must be at least 0',
    }),
  }),

  id: Joi.object({
    id: Joi.number().integer().positive().required().messages({
      'number.base': 'ID must be a number',
      'number.integer': 'ID must be an integer',
      'number.positive': 'ID must be a positive number',
      'any.required': 'ID is required',
    }),
  }),
};

/**
 * Validation middleware factory
 * @param {Joi.Schema} schema - Joi validation schema
 * @param {string} source - Source of data to validate (body, query, params)
 * @returns {Function} Express middleware
 */
const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[source], {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      return res.status(400).json({
        error: {
          message: 'Validation failed',
          statusCode: 400,
          details: errors,
        },
      });
    }

    req[source] = value;
    next();
  };
};

module.exports = {
  userSchemas,
  validate,
};
