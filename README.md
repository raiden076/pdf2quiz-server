local documentation
```yaml
openapi: 3.0.0
info:
  title: PDF Quiz Generator API
  version: 1.0.0
servers:
  - url: http://localhost:3000
components:
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
paths:
  /api/auth/register:
    post:
      summary: Register a new user
      tags:
        - Auth
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - username
                - password
              properties:
                username:
                  type: string
                password:
                  type: string
      responses:
        '200':
          description: User registered successfully
        '400':
          description: Bad request
  /api/auth/login:
    post:
      summary: Login an existing user
      tags:
        - Auth
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - username
                - password
              properties:
                username:
                  type: string
                password:
                  type: string
      responses:
        '200':
          description: User logged in successfully
        '400':
          description: Bad request
  /api/quiz/upload:
    post:
      summary: Upload PDF and initiate quiz generation
      tags:
        - Quiz
      security:
        - BearerAuth: []
      requestBody:
        required: true
        content:
          multipart/form-data:
            schema:
              type: object
              properties:
                pdfFile:
                  type: string
                  format: binary
                  description: The PDF file to upload
      responses:
        '200':
          description: Quiz generation initiated successfully
        '400':
          description: Bad request
        '401':
          description: Unauthorized
  /api/quiz/status/{quizSetId}:
    get:
      summary: Check the status of quiz generation
      tags:
        - Quiz
      security:
        - BearerAuth: []
      parameters:
        - name: quizSetId
          in: path
          required: true
          schema:
            type: string
          description: The ID of the quiz set
      responses:
        '200':
          description: Quiz status retrieved successfully
        '400':
          description: Bad request
        '401':
          description: Unauthorized
        '404':
          description: Quiz set not found
  /api/quiz/{quizSetId}:
    get:
      summary: Retrieve generated quiz questions
      tags:
        - Quiz
      security:
        - BearerAuth: []
      parameters:
        - name: quizSetId
          in: path
          required: true
          schema:
            type: string
          description: The ID of the quiz set
      responses:
        '200':
          description: Quiz questions retrieved successfully
        '400':
          description: Bad request
        '401':
          description: Unauthorized
        '404':
          description: Quiz set not found or not ready
  /api/quiz/submit/{quizSetId}:
    post:
      summary: Submit answers for a quiz
      tags:
        - Quiz
      security:
        - BearerAuth: []
      parameters:
        - name: quizSetId
          in: path
          required: true
          schema:
            type: string
          description: The ID of the quiz set
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                answers:
                  type: array
                  items:
                    type: integer
                  description: User's answers to the quiz
      responses:
        '200':
          description: Quiz submitted successfully
        '400':
          description: Bad request
        '401':
          description: Unauthorized
        '404':
          description: Quiz set not found
  /api/sessions:
    get:
      summary: Get user's quiz sessions
      tags:
        - Sessions
      security:
        - BearerAuth: []
      responses:
        '200':
          description: User sessions retrieved successfully
        '401':
          description: Unauthorized
  /api/sessions/{sessionId}:
    get:
      summary: Get details of a specific quiz session
      tags:
        - Sessions
      security:
        - BearerAuth: []
      parameters:
        - name: sessionId
          in: path
          required: true
          schema:
            type: string
          description: The ID of the session
      responses:
        '200':
          description: Session details retrieved successfully
        '401':
          description: Unauthorized
        '404':
          description: Session not found
  /api/users/me:
    get:
      summary: Get user profile information
      tags:
        - Users
      security:
        - BearerAuth: []
      responses:
        '200':
          description: User profile retrieved successfully
        '401':
          description: Unauthorized
```
