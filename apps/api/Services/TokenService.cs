using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Axtest.Api.Models;
using Microsoft.IdentityModel.Tokens;

namespace Axtest.Api.Services;

public class TokenService(IConfiguration config)
{
    public string Generate(User user)
    {
        var key    = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(config["Jwt:Secret"]!));
        var creds  = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var expiry = DateTime.UtcNow.AddDays(30);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, user.Email),
            new Claim("name", user.Name),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
        };

        var token = new JwtSecurityToken(
            issuer:   config["Jwt:Issuer"],
            audience: config["Jwt:Audience"],
            claims:   claims,
            expires:  expiry,
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
