import MainEntity from "@/entities/mainEntity";

export default class User extends MainEntity{
  id = 0
  username = ''
  created_at = 0
  last_login_at = 0
  name = ''
  age = 0
  email = ''

  getUserName() {
    return this.username || this.id
  }

  getFullName() {
    return `${this.name} ${this.age}`;
  }

  getEmailDomain() {
    return this.email.split('@')[1];
  }

  isAdult() {
    return this.age >= 18;
  }

  static createFromJSON(json) {
    return new User(json.name, json.age, json.email);
  }
}